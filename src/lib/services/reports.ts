// src/lib/services/reports.ts
// Spec §17 — reports with filters and export
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
      owner: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return quotes.map((q) => ({
    quoteId: q.id,
    quoteNumber: q.quoteNumber,
    customerName: q.customer.name,
    repName: q.owner.name,
    status: q.status,
    subtotal: q.subtotal.toString(),
    discountPct: q.blendedDiscountPct.toString(),
    marginPct: q.marginPct.toString(),
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

  const productWhere: Record<string, unknown> = {};
  if (filters.productId) productWhere.id = filters.productId;

  const confirmedQuotes = await prisma.quote.findMany({
    where: quoteWhere,
    select: { id: true },
  });
  const confirmedQuoteIds = confirmedQuotes.map((q) => q.id);

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

  const where: Record<string, unknown> = {
    createdAt: { gte: start, lte: end },
  };

  if (filters.repId) where.ownerId = filters.repId;

  const quotes = await prisma.quote.findMany({
    where,
    include: {
      owner: true,
      approvals: true,
    },
  });

  const byRep: Record<string, {
    name: string;
    submitted: number;
    approved: number;
    rejected: number;
    pending: number;
    totalTurnaroundMs: number;
    turnaroundCount: number;
  }> = {};

  for (const q of quotes) {
    const repId = q.ownerId;
    if (!byRep[repId]) {
      byRep[repId] = {
        name: q.owner.name,
        submitted: 0,
        approved: 0,
        rejected: 0,
        pending: 0,
        totalTurnaroundMs: 0,
        turnaroundCount: 0,
      };
    }

    byRep[repId].submitted += 1;

    if (q.status === "PENDING_APPROVAL" || q.status === "NEGOTIATING") {
      byRep[repId].pending += 1;
    } else if (q.status === "CONFIRMED") {
      byRep[repId].approved += 1;
      const approvedApproval = q.approvals.find((a) => a.status === "APPROVED" && a.decidedAt);
      if (approvedApproval && approvedApproval.decidedAt) {
        byRep[repId].totalTurnaroundMs += approvedApproval.decidedAt.getTime() - approvedApproval.createdAt.getTime();
        byRep[repId].turnaroundCount += 1;
      }
    } else if (q.status === "REJECTED") {
      byRep[repId].rejected += 1;
    }
  }

  return Object.entries(byRep).map(([repId, data]) => ({
    repId,
    repName: data.name,
    submitted: data.submitted,
    approved: data.approved,
    rejected: data.rejected,
    pending: data.pending,
    approvalRate: data.submitted > 0 ? Math.round((data.approved / data.submitted) * 10000) / 100 : 0,
    avgTurnaroundHours: data.turnaroundCount > 0
      ? Math.round((data.totalTurnaroundMs / data.turnaroundCount / (1000 * 60 * 60)) * 10) / 10
      : null,
  }));
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
