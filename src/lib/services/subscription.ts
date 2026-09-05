// src/lib/services/subscription.ts
// Spec §16 — subscription lifecycle, proration, and billing schedule.
// Money is always Prisma.Decimal. Never use JS number for money.
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { dec, round2 } from "@/lib/services/billing";

export type DecimalInput = string | number | Prisma.Decimal;

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

function computeNextBillingDate(startDate: Date, billingCycle: string): Date {
  const next = new Date(startDate);
  if (billingCycle === "MONTHLY") {
    next.setMonth(next.getMonth() + 1);
  } else if (billingCycle === "QUARTERLY") {
    next.setMonth(next.getMonth() + 3);
  } else if (billingCycle === "YEARLY") {
    next.setFullYear(next.getFullYear() + 1);
  }
  return next;
}

function computePeriodEnd(startDate: Date, billingCycle: string): Date {
  const end = new Date(startDate);
  if (billingCycle === "MONTHLY") {
    end.setMonth(end.getMonth() + 1);
    end.setDate(end.getDate() - 1);
  } else if (billingCycle === "QUARTERLY") {
    end.setMonth(end.getMonth() + 3);
    end.setDate(end.getDate() - 1);
  } else if (billingCycle === "YEARLY") {
    end.setFullYear(end.getFullYear() + 1);
    end.setDate(end.getDate() - 1);
  }
  return end;
}

export async function createSubscription(params: {
  customerId: string;
  orderId: string;
  orderLineId: string;
  productId: string;
  planId: string;
  quantity: number;
  startDate: Date;
  autoPayEnabled: boolean;
}) {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: params.planId },
  });
  if (!plan) throw new Error(`Subscription plan ${params.planId} not found`);
  if (!plan.active) throw new Error("Subscription plan is not active");

  const monthlyAmount = dec(plan.price).times(params.quantity);
  const periodStart = params.startDate;
  const periodEnd = computePeriodEnd(params.startDate, plan.billingCycle);
  const nextBilling = computeNextBillingDate(params.startDate, plan.billingCycle);

  const subscription = await prisma.subscription.create({
    data: {
      customerId: params.customerId,
      orderId: params.orderId,
      orderLineId: params.orderLineId,
      productId: params.productId,
      planId: params.planId,
      quantity: params.quantity,
      status: "ACTIVE",
      startDate: params.startDate,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      nextBillingDate: nextBilling,
      autoPayEnabled: params.autoPayEnabled,
    },
  });

  await writeAudit({
    entityType: "Subscription",
    entityId: subscription.id,
    action: "CREATED",
    before: undefined,
    after: {
      customerId: params.customerId,
      planId: params.planId,
      quantity: params.quantity,
      monthlyAmount: monthlyAmount.toString(),
    },
  });

  return subscription;
}

export async function updateSubscription(
  subscriptionId: string,
  updates: {
    quantity?: number;
    planId?: string;
    autoPayEnabled?: boolean;
    status?: "ACTIVE" | "PAUSED" | "CANCELLED" | "EXPIRED" | "PAST_DUE";
  }
) {
  const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
  if (!sub) throw new Error(`Subscription ${subscriptionId} not found`);

  const updated = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: updates,
  });

  await writeAudit({
    entityType: "Subscription",
    entityId: subscriptionId,
    action: "UPDATED",
    before: {
      quantity: sub.quantity,
      autoPayEnabled: sub.autoPayEnabled,
      status: sub.status,
    },
    after: {
      quantity: updated.quantity,
      autoPayEnabled: updated.autoPayEnabled,
      status: updated.status,
    },
  });

  return updated;
}

export async function cancelSubscription(
  subscriptionId: string,
  immediate: boolean = false
) {
  const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
  if (!sub) throw new Error(`Subscription ${subscriptionId} not found`);

  const status = immediate ? "CANCELLED" : "ACTIVE";
  const updated = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status },
  });

  await writeAudit({
    entityType: "Subscription",
    entityId: subscriptionId,
    action: immediate ? "CANCELLED_IMMEDIATE" : "CANCELLED",
    before: { status: sub.status },
    after: { status: updated.status },
  });

  return updated;
}

export async function changeSubscriptionPlan(
  subscriptionId: string,
  newPlanId: string
): Promise<{ prorationAmount: Prisma.Decimal; newSubscription: Awaited<ReturnType<typeof prisma.subscription.update>> }> {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });
  if (!sub) throw new Error(`Subscription ${subscriptionId} not found`);

  const newPlan = await prisma.subscriptionPlan.findUnique({ where: { id: newPlanId } });
  if (!newPlan) throw new Error(`Plan ${newPlanId} not found`);

  const oldPrice = dec(sub.plan.price).times(sub.quantity);
  const newPrice = dec(newPlan.price).times(sub.quantity);

  const now = new Date();
  const periodStart = sub.currentPeriodStart;
  const periodEnd = sub.currentPeriodEnd;
  const totalDays = daysInMonth(periodStart);
  const startDay = periodStart.getDate();
  const remaining = daysRemaining(startDay, totalDays);
  const fraction = new Prisma.Decimal(remaining).dividedBy(totalDays);

  const oldUnusedCredit = round2(oldPrice.times(fraction));
  const newPlanCharge = round2(newPrice.times(fraction));
  const prorationAmount = newPlanCharge.minus(oldUnusedCredit);

  const updated = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      planId: newPlanId,
      currentPeriodEnd: computePeriodEnd(now, newPlan.billingCycle),
      nextBillingDate: computeNextBillingDate(now, newPlan.billingCycle),
    },
  });

  await writeAudit({
    entityType: "Subscription",
    entityId: subscriptionId,
    action: "PLAN_CHANGED",
    before: { planId: sub.planId },
    after: { planId: newPlanId, prorationAmount: prorationAmount.toString() },
  });

  return { prorationAmount, newSubscription: updated };
}

export async function getSubscriptionById(subscriptionId: string) {
  return prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      plan: true,
      customer: true,
    },
  });
}

export async function listSubscriptions(options: {
  customerId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const { customerId, status, limit = 50, offset = 0 } = options;

  const where: Record<string, unknown> = {};
  if (customerId) where.customerId = customerId;
  if (status) where.status = status;

  const [subscriptions, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      include: { plan: true, customer: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.subscription.count({ where }),
  ]);

  return { subscriptions, total };
}

export async function getDueSubscriptions() {
  const now = new Date();
  return prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      nextBillingDate: { lte: now },
    },
    include: { plan: true, customer: true },
  });
}
