// worker/index.ts
// BullMQ worker — runs as a separate Node process.
// Must not import from Next.js app layer.
import { Worker, Queue } from "bullmq";
import Redis from "ioredis";
import { PrismaClient, Prisma } from "../src/generated/prisma";

const redisConnection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: 3,
});

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

// ─── Quote state change job ──────────────────────────────────────────────────

async function handleQuoteStateChanged(job: { data: { quoteId: string } }) {
  const { quoteId } = job.data;
  console.log(`[quoteStateChanged] Processing quote ${quoteId}`);

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { lines: { include: { product: true } }, customer: true },
  });

  if (!quote) {
    console.warn(`[quoteStateChanged] Quote ${quoteId} not found`);
    return;
  }

  // Anomaly detection (§6.6) — deterministic rules only.
  const blendedDiscountPct = Number(quote.blendedDiscountPct);
  const tierCeilingMap: Record<string, number> = {
    BRONZE: 10,
    SILVER: 15,
    GOLD: 20,
    PLATINUM: 25,
  };
  const tierCeiling = tierCeilingMap[quote.customer.tier] ?? 10;

  const newAnomalies: string[] = [];

  // DEEP_DISCOUNT — blended discount exceeds tier ceiling by more than 10 points
  if (blendedDiscountPct > tierCeiling + 10) {
    newAnomalies.push("DEEP_DISCOUNT");
  }

  // NEGATIVE_MARGIN — any line where lineTotal < unitCost * qty
  for (const line of quote.lines) {
    const lineTotal = Number(line.lineTotal);
    const costTotal = Number(line.product.unitCost) * line.qty;
    if (lineTotal < costTotal) {
      newAnomalies.push("NEGATIVE_MARGIN");
      break;
    }
  }

  // EXCESSIVE_REAPPROVAL — reapprovalCount >= 3
  if (quote.reapprovalCount >= 3) {
    newAnomalies.push("EXCESSIVE_REAPPROVAL");
  }

  // Delete old anomalies of these kinds and create new ones
  if (newAnomalies.length > 0) {
    await prisma.anomaly.deleteMany({
      where: {
        quoteId,
        kind: { in: newAnomalies as ("DEEP_DISCOUNT" | "NEGATIVE_MARGIN" | "EXCESSIVE_REAPPROVAL")[] },
      },
    });

    for (const kind of newAnomalies) {
      let detail = "";
      if (kind === "DEEP_DISCOUNT") {
        detail = `Blended discount ${blendedDiscountPct}% exceeds tier ceiling ${tierCeiling}% by ${blendedDiscountPct - tierCeiling} points`;
      } else if (kind === "NEGATIVE_MARGIN") {
        detail = "One or more lines have negative margin";
      } else if (kind === "EXCESSIVE_REAPPROVAL") {
        detail = `Quote has been submitted ${quote.reapprovalCount} times for approval`;
      }

      await prisma.anomaly.create({
        data: {
          quoteId,
          kind: kind as "DEEP_DISCOUNT" | "NEGATIVE_MARGIN" | "EXCESSIVE_REAPPROVAL",
          detail,
        },
      });
    }

    console.log(`[quoteStateChanged] Created ${newAnomalies.length} anomalies for quote ${quoteId}`);
  }
}

// ─── Billing scheduler job ───────────────────────────────────────────────────

async function handleBillingJob(_job: unknown) {
  console.log("[billingScheduler] Running billing scheduler...");

  const now = new Date();

  const dueSubscriptions = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      nextBillingDate: { lte: now },
    },
    include: { plan: true, customer: true },
  });

  console.log(`[billingScheduler] Found ${dueSubscriptions.length} subscriptions due for billing`);

  for (const sub of dueSubscriptions) {
    try {
      const invoiceNumber = `INV-REC-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const amount = Number(sub.plan.price) * sub.quantity;

      await prisma.invoice.create({
        data: {
          quoteId: sub.orderId,
          customerId: sub.customerId,
          invoiceNumber,
          amount: new Prisma.Decimal(amount),
          subtotal: new Prisma.Decimal(amount),
          taxAmount: new Prisma.Decimal(0),
          invoiceType: "RECURRING",
          status: sub.autoPayEnabled ? "ISSUED" : "ISSUED",
          dueAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const nextBillingDate = new Date(sub.nextBillingDate);
      if (sub.plan.billingCycle === "MONTHLY") {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      } else if (sub.plan.billingCycle === "QUARTERLY") {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 3);
      } else if (sub.plan.billingCycle === "YEARLY") {
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
      }

      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          currentPeriodStart: sub.nextBillingDate,
          currentPeriodEnd: now,
          nextBillingDate,
          status: sub.autoPayEnabled ? "ACTIVE" : "PAST_DUE",
        },
      });

      console.log(`[billingScheduler] Created recurring invoice for subscription ${sub.id}`);
    } catch (err) {
      console.error(`[billingScheduler] Failed to bill subscription ${sub.id}:`, err);
    }
  }
}

// ─── Worker setup ────────────────────────────────────────────────────────────

const quoteStateWorker = new Worker(
  "quote-state",
  async (job) => {
    if (job.name === "quoteStateChanged") {
      await handleQuoteStateChanged(job);
    }
  },
  { connection: redisConnection, concurrency: 5 }
);

const billingWorker = new Worker(
  "billing",
  async (job) => {
    if (job.name === "billingScheduler") {
      await handleBillingJob(job);
    }
  },
  { connection: redisConnection, concurrency: 1 }
);

quoteStateWorker.on("completed", (job) => {
  console.log(`[worker] quoteState job ${job.id} completed`);
});

quoteStateWorker.on("failed", (job, err) => {
  console.error(`[worker] quoteState job ${job?.id} failed:`, err);
});

billingWorker.on("completed", (job) => {
  console.log(`[worker] billing job ${job.id} completed`);
});

billingWorker.on("failed", (job, err) => {
  console.error(`[worker] billing job ${job?.id} failed:`, err);
});

// ─── Schedule billing job to run every hour ─────────────────────────────────

async function scheduleBillingJob() {
  const billingQueue = new Queue("billing", { connection: redisConnection });
  await billingQueue.add("billingScheduler", {}, {
    repeat: { every: 60 * 60 * 1000 }, // every hour
    removeOnComplete: true,
  });
  console.log("[worker] Billing scheduler job scheduled");
}

scheduleBillingJob().catch(console.error);

console.log("[worker] DealFlow360 worker started");

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[worker] Received SIGTERM, shutting down...");
  await quoteStateWorker.close();
  await billingWorker.close();
  await prisma.$disconnect();
  process.exit(0);
});
