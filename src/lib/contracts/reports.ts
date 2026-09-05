// src/lib/contracts/reports.ts
import { z } from "zod";

export const ReportFilterSchema = z.object({
  period: z.enum(["this_month", "last_month", "last_quarter", "this_year", "all"]).optional(),
  repId: z.string().optional(),
  approvalStatus: z.enum(["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "NEGOTIATING", "CONFIRMED"]).optional(),
  productId: z.string().optional(),
  customerId: z.string().optional(),
  format: z.enum(["json", "csv", "xls"]).optional(),
});

export type ReportFilterInput = z.infer<typeof ReportFilterSchema>;

export interface ReportRow {
  quoteId: string;
  quoteNumber: string;
  customerName: string;
  repName: string;
  status: string;
  subtotal: string;
  discountPct: string;
  marginPct: string;
  createdAt: string;
  confirmedAt: string | null;
}

export interface RevenueReportRow {
  month: string;
  revenue: number;
  orderCount: number;
  avgDealSize: number;
}

export interface ProductPerformanceRow {
  productId: string;
  productName: string;
  category: string;
  unitsSold: number;
  revenue: number;
  avgDiscount: number;
}

export interface ApprovalMetricsRow {
  repId: string;
  repName: string;
  submitted: number;
  approved: number;
  rejected: number;
  pending: number;
  approvalRate: number;
  avgTurnaroundHours: number | null;
}
