// src/lib/services/reports.ts
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { ReportRow, RevenueReportRow, ProductPerformanceRow, ApprovalMetricsRow } from "@/lib/contracts/reports";

export interface ReportFilters {
  period?: "this_month" | "last_month" | "last_quarter" | "this_year" | "all";
  repId?: string;
  approvalStatus?: string;
  productId?: string;
  customerId?: string;
}

function getDateRange(period?: string): { start: Date; end: Date } {
  const now = new Date();
  let start = new Date(now.getFullYear(), 0, 1);
  let end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  if (period === "this_month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  } else if (period === "last_month") {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  } else if (period === "last_quarter") {
    const quarter = Math.floor(now.getMonth() / 3);
    start = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
    end = new Date(now.getFullYear(), quarter * 3, 0, 23, 59, 59);
  } else if (period === "this_year") {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
  }

  return { start, end };
}

export async function getQuoteReport(filters: ReportFilters): Promise<ReportRow[]> {
  const { start, end } = getDateRange(filters.period);

  const where: Record<string, unknown> = {
    createdAt: { gte: start, lte: end },
  };

  if (filters.repId) where.ownerId = filters.repId;
  if (filters.approvalStatus) where.status = filters.approvalStatus;
  if (filters.customerId) where.customerId = filters.customerId;
  if (filters.productId) {
    where.lines = { some: { productId: filters.productId } };
  }

  const quotes = await prisma.quote.findMany({
    where,
    include: {
      customer: true,
      owner: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return quotes.map((q) => ({
    quoteId: q.id,
    quoteNumber: q.quoteNumber,
    customerName: q.customer.companyName,
    repName: q.owner?.name ?? "Sales Rep",
    repId: q.owner?.id ?? null,
    status: q.status,
    subtotal: Number(q.subtotal),
    discountPct: Number(q.blendedDiscountPct),
    marginPct: Number(q.marginPct),
    createdAt: q.createdAt.toISOString(),
    confirmedAt: q.status === "CONFIRMED" ? q.updatedAt.toISOString() : null,
  }));
}

export async function getRevenueReport(filters: ReportFilters): Promise<RevenueReportRow[]> {
  const { start, end } = getDateRange(filters.period);

  const quotes = await prisma.quote.findMany({
    where: {
      status: "CONFIRMED",
      updatedAt: { gte: start, lte: end },
    },
    select: {
      grandTotal: true,
      updatedAt: true,
    },
  });

  const byMonth: Record<string, { revenue: number; count: number }> = {};

  // Ensure every month in range has at least a zero entry
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const endCursor = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= endCursor) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth[key]) byMonth[key] = { revenue: 0, count: 0 };
    cursor.setMonth(cursor.getMonth() + 1);
  }

  for (const q of quotes) {
    const monthKey = `${q.updatedAt.getFullYear()}-${String(q.updatedAt.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth[monthKey]) {
      byMonth[monthKey] = { revenue: 0, count: 0 };
    }
    byMonth[monthKey].revenue += Number(q.grandTotal);
    byMonth[monthKey].count += 1;
  }

  return Object.entries(byMonth)
    .map(([month, data]) => ({
      month,
      revenue: Math.round(data.revenue * 100) / 100,
      orderCount: data.count,
      avgDealSize: data.count > 0 ? Math.round((data.revenue / data.count) * 100) / 100 : 0,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export async function getProductPerformanceReport(filters: ReportFilters): Promise<ProductPerformanceRow[]> {
  const { start, end } = getDateRange(filters.period);

  const quoteWhere: Record<string, unknown> = {
    status: "CONFIRMED",
    updatedAt: { gte: start, lte: end },
  };
  if (filters.customerId) quoteWhere.customerId = filters.customerId;

  const confirmedQuotes = await prisma.quote.findMany({
    where: quoteWhere,
    select: { id: true },
  });
  const confirmedQuoteIds = confirmedQuotes.map((q) => q.id);

  if (confirmedQuoteIds.length === 0) {
    return [];
  }

  const lineWhere: Record<string, unknown> = {
    quoteId: { in: confirmedQuoteIds },
  };
  if (filters.productId) lineWhere.productId = filters.productId;

  const lines = await prisma.quoteLine.findMany({
    where: lineWhere,
    include: { product: true },
  });

  const byProduct: Record<string, { name: string; category: string; units: number; revenue: number; totalDiscount: number; count: number }> = {};

  for (const line of lines) {
    if (!byProduct[line.productId]) {
      byProduct[line.productId] = {
        name: line.product.name,
        category: line.product.category,
        units: 0,
        revenue: 0,
        totalDiscount: 0,
        count: 0,
      };
    }
    byProduct[line.productId].units += line.qty;
    byProduct[line.productId].revenue += Number(line.lineTotal);
    byProduct[line.productId].totalDiscount += Number(line.discountPct);
    byProduct[line.productId].count += 1;
  }

  return Object.entries(byProduct).map(([productId, data]) => ({
    productId,
    productName: data.name,
    category: data.category,
    unitsSold: data.units,
    revenue: Math.round(data.revenue * 100) / 100,
    avgDiscount: data.count > 0 ? Math.round((data.totalDiscount / data.count) * 100) / 100 : 0,
  }));
}

export async function getApprovalMetricsReport(filters: ReportFilters): Promise<ApprovalMetricsRow[]> {
  const { start, end } = getDateRange(filters.period);

  const quotes = await prisma.quote.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      ...(filters.repId ? { ownerId: filters.repId } : {}),
    },
    include: {
      owner: { select: { id: true, name: true } },
      approvals: { select: { status: true, decidedAt: true, createdAt: true } },
    },
  });

  const byRep: Record<string, { name: string; submitted: number; approved: number; rejected: number; pending: number; turnaroundSum: number; turnaroundCount: number }> = {};

  for (const q of quotes) {
    const repId = q.owner?.id ?? "unknown";
    if (!byRep[repId]) {
      byRep[repId] = {
        name: q.owner?.name ?? "Unknown",
        submitted: 0,
        approved: 0,
        rejected: 0,
        pending: 0,
        turnaroundSum: 0,
        turnaroundCount: 0,
      };
    }
    const entry = byRep[repId];
    if (q.status === "PENDING_APPROVAL") entry.pending += 1;
    if (q.status === "APPROVED" || q.status === "CONFIRMED") entry.approved += 1;
    if (q.status === "REJECTED") entry.rejected += 1;
    if (q.approvals.length > 0) {
      entry.submitted += q.approvals.length;
      for (const a of q.approvals) {
        if (a.decidedAt) {
          const hours = (a.decidedAt.getTime() - a.createdAt.getTime()) / (1000 * 60 * 60);
          entry.turnaroundSum += hours;
          entry.turnaroundCount += 1;
        }
      }
    }
  }

  return Object.entries(byRep).map(([repId, data]) => {
    const decided = data.approved + data.rejected;
    return {
      repId,
      repName: data.name,
      submitted: data.submitted,
      approved: data.approved,
      rejected: data.rejected,
      pending: data.pending,
      approvalRate: decided > 0 ? Math.round((data.approved / decided) * 10000) / 100 : 0,
      avgTurnaroundHours: data.turnaroundCount > 0 ? Math.round((data.turnaroundSum / data.turnaroundCount) * 100) / 100 : null,
    };
  });
}

export function formatCSV<T extends Record<string, unknown>>(rows: T[], columns: (keyof T)[]): string {
  const header = columns.join(",");
  const body = rows.map((row) =>
    columns.map((col) => {
      const val = row[col];
      if (val === null || val === undefined) return "";
      if (typeof val === "string" && (val.includes(",") || val.includes('"') || val.includes("\n"))) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return String(val);
    }).join(",")
  );
  return [header, ...body].join("\n");
}
