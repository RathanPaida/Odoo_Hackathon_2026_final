// src/app/api/reports/route.ts
// GET /api/reports?type=quotes|revenue|products|approvals&format=json|csv|xls
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { getQuoteReport, getRevenueReport, getProductPerformanceReport, getApprovalMetricsReport, formatCSV } from "@/lib/services/reports";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { user, response } = await requireRole("ADMIN", "SALES_MANAGER", "FINANCE");
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "quotes";
  const format = searchParams.get("format") ?? "json";
  const period = searchParams.get("period") ?? "all";
  const repId = searchParams.get("repId") ?? undefined;
  const approvalStatus = searchParams.get("approvalStatus") ?? undefined;
  const productId = searchParams.get("productId") ?? undefined;
  const customerId = searchParams.get("customerId") ?? undefined;

  const filters = { period: period as "this_month" | "last_month" | "last_quarter" | "this_year" | "all", repId, approvalStatus, productId, customerId };

  try {
    let data: unknown;
    let csvColumns: string[] = [];

    switch (type) {
      case "quotes":
        data = await getQuoteReport(filters);
        csvColumns = ["quoteNumber", "customerName", "repName", "status", "subtotal", "discountPct", "marginPct", "createdAt", "confirmedAt"];
        break;
      case "revenue":
        data = await getRevenueReport(filters);
        csvColumns = ["month", "revenue", "orderCount", "avgDealSize"];
        break;
      case "products":
        data = await getProductPerformanceReport(filters);
        csvColumns = ["productName", "category", "unitsSold", "revenue", "avgDiscount"];
        break;
      case "approvals":
        data = await getApprovalMetricsReport(filters);
        csvColumns = ["repName", "submitted", "approved", "rejected", "pending", "approvalRate", "avgTurnaroundHours"];
        break;
      default:
        return NextResponse.json(
          { success: false, error: { code: "INVALID_TYPE", message: "Invalid report type" } },
          { status: 400 }
        );
    }

    if (format === "csv") {
      const csv = formatCSV(data as Record<string, unknown>[], csvColumns as (keyof Record<string, unknown>)[]);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="report-${type}-${Date.now()}.csv"`,
        },
      });
    }

    if (format === "xls") {
      const csv = formatCSV(data as Record<string, unknown>[], csvColumns as (keyof Record<string, unknown>)[]);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "application/vnd.ms-excel",
          "Content-Disposition": `attachment; filename="report-${type}-${Date.now()}.xls"`,
        },
      });
    }

    return NextResponse.json({ success: true, data: Array.isArray(data) ? data : [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
