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
  console.log(`[quoteStateChanged] Processing quotation ${quoteId}`);

  const quotation = await prisma.quotation.findUnique({
    where: { id: quoteId },
    include: { lines: { include: { product: true } }, customer: true },
  });

  if (!quotation) {
    console.warn(`[quoteStateChanged] Quotation ${quoteId} not found`);
    return;
  }

  // Anomaly detection removed due to schema refactor.
  console.log(`[quoteStateChanged] Quotation ${quoteId} processed successfully.`);
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
          orderId: sub.orderId,
          customerId: sub.customerId,
          invoiceNumber,
          subtotal: new Prisma.Decimal(amount),
          totalAmount: new Prisma.Decimal(amount),
          taxAmount: new Prisma.Decimal(0),
          invoiceType: "RECURRING",
          status: sub.autoPayEnabled ? "ISSUED" : "ISSUED",
          dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
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
    // @ts-ignore
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
