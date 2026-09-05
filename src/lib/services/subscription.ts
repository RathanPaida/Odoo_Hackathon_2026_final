// src/lib/services/subscription.ts
// Spec §16 — subscription lifecycle, proration, and billing schedule.
// Money is always Prisma.Decimal. Never use JS number for money.
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export type DecimalInput = string | number | Prisma.Decimal;

function dec(value: DecimalInput): Prisma.Decimal {
  return value instanceof Prisma.Decimal
    ? value
    : new Prisma.Decimal(String(value));
}

function round2(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function daysRemaining(startDay: number, totalDays: number): number {
  return totalDays - startDay + 1;
}

export function computeProration(
  monthlyAmount: DecimalInput,
  startDate: Date
): Prisma.Decimal {
  const amount = dec(monthlyAmount);
  const totalDays = daysInMonth(startDate);
  const startDay = startDate.getDate();
  const remaining = daysRemaining(startDay, totalDays);
  const fraction = new Prisma.Decimal(remaining).dividedBy(totalDays);
  return round2(amount.times(fraction));
}

/**
 * Create a subscription line for a recurring quote line.
 */
export async function createSubscriptionLine(params: {
  subscriptionId: string;
  quoteLineId: string;
  monthlyAmount: DecimalInput;
  startDate: Date;
  months: number;
  invoiceId?: string;
}) {
  const monthlyDec = dec(params.monthlyAmount);
  const proratedFirst = computeProration(monthlyDec, params.startDate);

  const subscriptionLine = await prisma.subscriptionLine.create({
    data: {
      subscriptionId: params.subscriptionId,
      quoteLineId: params.quoteLineId,
      invoiceId: params.invoiceId ?? null,
      monthlyAmount: monthlyDec,
      startDate: params.startDate,
      months: params.months,
      proratedFirstAmount: proratedFirst,
    },
  });

  await writeAudit({
    entityType: "SubscriptionLine",
    entityId: subscriptionLine.id,
    action: "CREATED",
    before: undefined,
    after: {
      quoteLineId: params.quoteLineId,
      monthlyAmount: monthlyDec.toString(),
      months: params.months,
      proratedFirstAmount: proratedFirst.toString(),
    },
  });

  return subscriptionLine;
}

/**
 * Get subscription line by ID.
 */
export async function getSubscriptionLineById(id: string) {
  return prisma.subscriptionLine.findUnique({
    where: { id },
    include: {
      quoteLine: {
        include: {
          product: true,
          quote: {
            include: { customer: true },
          },
        },
      },
      invoice: true,
    },
  });
}

/**
 * Get subscription line by quote line ID.
 */
export async function getSubscriptionLineByQuoteLine(quoteLineId: string) {
  return prisma.subscriptionLine.findUnique({
    where: { quoteLineId },
    include: {
      quoteLine: {
        include: {
          product: true,
        },
      },
      invoice: true,
    },
  });
}

/**
 * List all subscription lines, optionally filtered.
 */
export async function listSubscriptionLines(options: {
  limit?: number;
  offset?: number;
}) {
  const { limit = 50, offset = 0 } = options;

  const [lines, total] = await Promise.all([
    prisma.subscriptionLine.findMany({
      include: {
        quoteLine: {
          include: {
            product: true,
            quote: {
              include: { customer: true },
            },
          },
        },
        invoice: true,
      },
      orderBy: { startDate: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.subscriptionLine.count(),
  ]);

  return { lines, total };
}

/**
 * Create subscription lines for all recurring lines in a confirmed quote.
 */
export async function createSubscriptionsForQuote(
  quoteId: string,
  startDate: Date = new Date(),
  defaultMonths: number = 12,
  invoiceId?: string
) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      lines: {
        include: { product: true },
      },
    },
  });

  if (!quote) throw new Error(`Quote ${quoteId} not found`);

  const recurringLines = quote.lines.filter(
    (line) => line.billingType === "RECURRING"
  );

  const subscriptionLines = [];

  // Get a default plan if exists, else we create one
  let plan = await prisma.subscriptionPlan.findFirst();
  if (!plan) {
    plan = await prisma.subscriptionPlan.create({
      data: {
        name: "Default Plan",
        billingCycle: "MONTHLY",
        price: new Prisma.Decimal(0),
      }
    });
  }

  for (const line of recurringLines) {
    // We create the parent Subscription first
    const sub = await prisma.subscription.create({
      data: {
        customerId: quote.customerId,
        orderId: `ORDER-${quote.id}`, // Placeholder or real orderId
        productId: line.productId,
        planId: plan.id,
        startDate: startDate,
        currentPeriodStart: startDate,
        currentPeriodEnd: new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000),
        nextBillingDate: new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000),
      }
    });

    const monthlyAmount = line.lineTotal;
    const months = line.subscriptionMonths ?? defaultMonths;

    const subLine = await createSubscriptionLine({
      subscriptionId: sub.id,
      quoteLineId: line.id,
      monthlyAmount,
      startDate,
      months,
      invoiceId,
    });

    subscriptionLines.push(subLine);
  }

  return subscriptionLines;
}

/**
 * TEST 21, 22, 23 — Recurring billing scheduler and payment processing
 */
export async function runBillingScheduler(options?: {
  mockPaymentResult?: "SUCCESS" | "FAILED";
}) {
  const now = new Date();
  
  // Find all ACTIVE subscriptions where nextBillingDate <= now
  const dueSubscriptions = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      nextBillingDate: { lte: now },
    },
    include: {
      customer: true,
      plan: true,
      lines: { include: { quoteLine: { include: { product: true } } } },
    },
  });

  const results = [];

  for (const sub of dueSubscriptions) {
    const amount = sub.lines.length > 0
      ? sub.lines.reduce((sum, l) => sum.plus(dec(l.monthlyAmount)), new Prisma.Decimal(0))
      : dec(sub.plan.price);

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const rand = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `REC-${year}${month}-${rand}`;

    const nextBilling = new Date(sub.nextBillingDate);
    nextBilling.setMonth(nextBilling.getMonth() + 1);

    // Create recurring invoice
    const invoice = await prisma.invoice.create({
      data: {
        quoteId: null,
        customerId: sub.customerId,
        invoiceNumber,
        amount,
        subtotal: amount,
        taxAmount: new Prisma.Decimal(0),
        paidAmount: new Prisma.Decimal(0),
        invoiceType: "RECURRING",
        status: "ISSUED",
        dueAt: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
      },
    });

    // If AutoPay is enabled, attempt payment
    let paymentStatus: "SUCCESS" | "FAILED" | "NOT_ATTEMPTED" = "NOT_ATTEMPTED";

    if (sub.autoPayEnabled) {
      const isSuccess = options?.mockPaymentResult !== "FAILED";
      paymentStatus = isSuccess ? "SUCCESS" : "FAILED";

      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          customerId: sub.customerId,
          amount,
          paymentMethod: "AUTOPAY_CREDIT_CARD",
          status: paymentStatus,
          transactionReference: `TX-${Date.now()}-${rand}`,
          paidAt: isSuccess ? new Date() : null,
        },
      });

      if (isSuccess) {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: "PAID", paidAmount: amount },
        });

        // Advance nextBillingDate on success
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            currentPeriodStart: sub.nextBillingDate,
            currentPeriodEnd: nextBilling,
            nextBillingDate: nextBilling,
          },
        });
      } else {
        // Payment failed -> invoice stays ISSUED/OVERDUE, subscription marked PAST_DUE
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: "OVERDUE" },
        });

        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: "PAST_DUE" },
        });
      }
    }

    results.push({
      subscriptionId: sub.id,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      autoPayEnabled: sub.autoPayEnabled,
      paymentStatus,
      nextBillingDate: sub.autoPayEnabled && paymentStatus === "SUCCESS" ? nextBilling : sub.nextBillingDate,
    });
  }

  return results;
}

/**
 * TEST 24 — Mid-period plan change proration
 * Calculates remaining period, unused old plan credit, new plan charge, and net proration amount
 */
export function calculatePlanChangeProration(params: {
  currentMonthlyAmount: DecimalInput;
  newMonthlyAmount: DecimalInput;
  periodStart: Date;
  periodEnd: Date;
  changeDate: Date;
}) {
  const oldAmount = dec(params.currentMonthlyAmount);
  const newAmount = dec(params.newMonthlyAmount);

  const totalPeriodDays = Math.max(
    1,
    Math.round((params.periodEnd.getTime() - params.periodStart.getTime()) / (24 * 60 * 60 * 1000))
  );

  const remainingDays = Math.max(
    0,
    Math.round((params.periodEnd.getTime() - params.changeDate.getTime()) / (24 * 60 * 60 * 1000))
  );

  const remainingFraction = new Prisma.Decimal(remainingDays).dividedBy(totalPeriodDays);

  const unusedOldPlanCredit = round2(oldAmount.times(remainingFraction));
  const newPlanRemainingCharge = round2(newAmount.times(remainingFraction));
  const netProrationAmount = round2(newPlanRemainingCharge.sub(unusedOldPlanCredit));

  return {
    totalPeriodDays,
    remainingDays,
    unusedOldPlanCredit,
    newPlanRemainingCharge,
    netProrationAmount,
  };
}
