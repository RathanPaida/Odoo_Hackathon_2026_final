// src/lib/services/dashboard.ts
// Spec §17 — dashboard aggregation by reading existing module tables.
// Do not duplicate operational tables for reporting.
import { prisma } from "@/lib/db";
import { QuoteStatus } from "@/generated/prisma";

export interface DashboardMetrics {
  totalQuotations: number;
  confirmedOrders: number;
  totalRevenue: number;
  pendingApprovals: number;
  approvedCount: number;
  rejectedCount: number;
  stalledQuotations: number;
  activeSubscriptions: number;
  overdueInvoices: number;
  fulfillmentDelays: number;
  backorderCount: number;
}

export interface QuoteMetrics {
  byStatus: Record<string, number>;
  byMonth: Array<{ month: string; count: number; value: number }>;
  discountDistribution: Array<{ range: string; count: number }>;
}

export interface StalledDeal {
  id: string;
  quoteNumber: string;
  customerName: string;
  grandTotal: string;
  status: string;
  lastActivity: Date;
  daysStalled: number;
}

export interface DiscountAnomaly {
  id: string;
  quoteId: string;
  quoteNumber: string;
  customerName: string;
  blendedDiscountPct: number;
  tierCeiling: number;
  excessPoints: number;
  detectedAt: Date;
}

export interface AnomalyMetrics {
  deepDiscountCount: number;
  negativeMarginCount: number;
  excessiveReapprovalCount: number;
}

const STALLED_THRESHOLD_DAYS = parseInt(process.env.STALLED_DEAL_THRESHOLD_DAYS ?? "5", 10);

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const now = new Date();

  const [
    totalQuotations,
    confirmedOrders,
    pendingApprovals,
    approvedCount,
    rejectedCount,
    overdueInvoices,
    activeSubscriptions,
    backorderCount,
    allQuotes,
  ] = await Promise.all([
    prisma.quote.count(),
    prisma.quote.count({ where: { status: "CONFIRMED" } }),
    prisma.quote.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.quote.count({ where: { status: "APPROVED" } }),
    prisma.quote.count({ where: { status: "REJECTED" } }),
    prisma.invoice.count({ where: { dueAt: { lt: now } } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.allocation.count({ where: { status: "BACKORDERED" } }),
    prisma.quote.findMany({
      select: {
        grandTotal: true,
        status: true,
        updatedAt: true,
      },
    }),
  ]);

  const totalRevenue = allQuotes
    .filter((q) => q.status === "CONFIRMED")
    .reduce((sum: number, q) => sum + Number(q.grandTotal), 0);

  const stalledQuotations = allQuotes.filter(
    (q) => {
      if (q.status === "CONFIRMED" || q.status === "REJECTED") return false;
      const diffMs = now.getTime() - q.updatedAt.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays > STALLED_THRESHOLD_DAYS;
    }
  ).length;

  return {
    totalQuotations,
    confirmedOrders,
    totalRevenue,
    pendingApprovals,
    approvedCount,
    rejectedCount,
    stalledQuotations,
    activeSubscriptions,
    overdueInvoices,
    fulfillmentDelays: 0,
    backorderCount,
  };
}

export async function getStalledDeals(): Promise<StalledDeal[]> {
  const now = new Date();
  const thresholdDate = new Date(now.getTime() - STALLED_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

  const quotes = await prisma.quote.findMany({
    where: {
      status: { notIn: ["CONFIRMED", "REJECTED"] },
      updatedAt: { lt: thresholdDate },
    },
    include: { customer: true },
    orderBy: { updatedAt: "asc" },
  });

  return quotes.map((q) => {
    const diffMs = now.getTime() - q.updatedAt.getTime();
    const daysStalled = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return {
      id: q.id,
      quoteNumber: q.quoteNumber,
      customerName: q.customer.companyName,
      grandTotal: q.grandTotal.toString(),
      status: q.status,
      lastActivity: q.updatedAt,
      daysStalled,
    };
  });
}

export async function getDiscountAnomalies(): Promise<DiscountAnomaly[]> {
  const anomalies = await prisma.anomaly.findMany({
    where: { kind: "DEEP_DISCOUNT" },
    include: {
      quote: {
        include: { customer: true },
      },
    },
    orderBy: { detectedAt: "desc" },
    take: 20,
  });

  return anomalies.map((a) => ({
    id: a.id,
    quoteId: a.quoteId,
    quoteNumber: a.quote.quoteNumber,
    customerName: a.quote.customer.companyName,
    blendedDiscountPct: Number(a.quote.blendedDiscountPct),
    tierCeiling: 15,
    excessPoints: Math.max(0, Number(a.quote.blendedDiscountPct) - 15),
    detectedAt: a.detectedAt,
  }));
}

export async function getAnomalyMetrics(): Promise<AnomalyMetrics> {
  const [deepDiscountCount, negativeMarginCount, excessiveReapprovalCount] = await Promise.all([
    prisma.anomaly.count({ where: { kind: "DEEP_DISCOUNT" } }),
    prisma.anomaly.count({ where: { kind: "NEGATIVE_MARGIN" } }),
    prisma.anomaly.count({ where: { kind: "EXCESSIVE_REAPPROVAL" } }),
  ]);

  return { deepDiscountCount, negativeMarginCount, excessiveReapprovalCount };
}

export async function getQuotePipelineValue(): Promise<Array<{ status: string; value: number; count: number }>> {
  const quotes = await prisma.quote.groupBy({
    by: ["status"],
    _sum: { grandTotal: true },
    _count: { id: true },
  });

  return quotes.map((q) => ({
    status: q.status,
    value: Number(q._sum.grandTotal ?? 0),
    count: q._count.id,
  }));
}

export async function getRevenueByMonth(months: number = 6): Promise<Array<{ month: string; revenue: number }>> {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  const quotes = await prisma.quote.findMany({
    where: {
      status: "CONFIRMED",
      updatedAt: { gte: startDate },
    },
    select: { grandTotal: true, updatedAt: true },
  });

  const byMonth: Record<string, number> = {};
  for (const q of quotes) {
    const monthKey = `${q.updatedAt.getFullYear()}-${String(q.updatedAt.getMonth() + 1).padStart(2, "0")}`;
    byMonth[monthKey] = (byMonth[monthKey] ?? 0) + Number(q.grandTotal);
  }

  return Object.entries(byMonth)
    .map(([month, revenue]) => ({ month, revenue }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export async function getApprovalTurnaround(): Promise<Array<{ approver: string; avgHours: number; count: number }>> {
  return [];
}
