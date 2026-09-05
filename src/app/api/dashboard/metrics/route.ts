// src/app/api/dashboard/metrics/route.ts
// Spec §5 — GET /api/dashboard/metrics
import { NextResponse } from "next/server";
import { getDashboardMetrics, getQuotePipelineValue, getRevenueByMonth } from "@/lib/services/dashboard";
import { requireRole } from "@/lib/auth/rbac";

export const runtime = "nodejs";

export async function GET() {
  const { user, response } = await requireRole("ADMIN", "SALES_MANAGER", "FINANCE");
  if (response) return response;

  try {
    const [metrics, pipeline, revenueByMonth] = await Promise.all([
      getDashboardMetrics(),
      getQuotePipelineValue(),
      getRevenueByMonth(6),
    ]);

    return NextResponse.json({
      success: true,
      data: { metrics, pipeline, revenueByMonth },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
