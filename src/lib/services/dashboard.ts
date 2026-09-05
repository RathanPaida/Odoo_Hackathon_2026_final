// src/lib/services/dashboard.ts
// Spec §17 — dashboard aggregation by reading existing module tables.
// Do not duplicate operational tables for reporting.
import { prisma } from "@/lib/db";
import { QuotationStatus } from "@/generated/prisma";

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
    activeSubscriptions,
    overdueInvoices,
    allQuotes,
  ] = await Promise.all([
    prisma.quotation.count(),
    prisma.quotation.count({ where: { status: "CONFIRMED" } }),
    prisma.quotation.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.quotation.count({ where: { status: "APPROVED" } }),
    prisma.quotation.count({ where: { status: "REJECTED" } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.invoice.count({ where: { status: "OVERDUE" } }),
    prisma.quotation.findMany({
      where: {
        status: { notIn: ["CONFIRMED", "REJECTED"] },
      },
      select: {
        totalAmount: true,
        status: true,
        updatedAt: true,
      },
    }),
  ]);

  const totalRevenue = allQuotes
    .filter((q) => q.status === "CONFIRMED")
    .reduce((sum, q) => sum + Number(q.totalAmount), 0);

  const stalledQuotations = allQuotes.filter(
    (q) => {
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
    backorderCount: 0,
  };
}

export async function getStalledDeals(): Promise<StalledDeal[]> {
  const now = new Date();
  const thresholdDate = new Date(now.getTime() - STALLED_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

  const quotes = await prisma.quotation.findMany({
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
      quoteNumber: q.quotationNumber,
      customerName: q.customer.companyName,
      grandTotal: q.totalAmount.toString(),
      status: q.status,
      lastActivity: q.updatedAt,
      daysStalled,
    };
  });
}

export async function getDiscountAnomalies(): Promise<DiscountAnomaly[]> {
  return [];
}

export async function getAnomalyMetrics(): Promise<AnomalyMetrics> {
  return { deepDiscountCount: 0, negativeMarginCount: 0, excessiveReapprovalCount: 0 };
}

export async function getQuotePipelineValue(): Promise<Array<{ status: string; value: number; count: number }>> {
  const quotes = await prisma.quotation.groupBy({
    by: ["status"],
    _sum: { totalAmount: true },
    _count: { id: true },
  });

  return quotes.map((q) => ({
    status: q.status,
    value: Number(q._sum.totalAmount ?? 0),
    count: q._count.id,
  }));
}

export async function getRevenueByMonth(months: number = 6): Promise<Array<{ month: string; revenue: number }>> {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  const quotes = await prisma.quotation.findMany({
    where: {
      status: "CONFIRMED",
      updatedAt: { gte: startDate },
    },
    select: { totalAmount: true, updatedAt: true },
  });

  const byMonth: Record<string, number> = {};
  for (const q of quotes) {
    const monthKey = `${q.updatedAt.getFullYear()}-${String(q.updatedAt.getMonth() + 1).padStart(2, "0")}`;
    byMonth[monthKey] = (byMonth[monthKey] ?? 0) + Number(q.totalAmount);
  }

  return Object.entries(byMonth)
    .map(([month, revenue]) => ({ month, revenue }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export async function getApprovalTurnaround(): Promise<Array<{ approver: string; avgHours: number; count: number }>> {
  return [];
}
