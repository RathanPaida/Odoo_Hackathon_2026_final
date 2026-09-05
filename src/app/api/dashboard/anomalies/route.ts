// src/app/api/dashboard/anomalies/route.ts
// Spec §5 — GET /api/dashboard/anomalies
import { NextResponse } from "next/server";
import { getStalledDeals, getDiscountAnomalies, getAnomalyMetrics } from "@/lib/services/dashboard";
import { requireRole } from "@/lib/auth/rbac";
import { serializeForApi } from "@/lib/api-response";

export const runtime = "nodejs";

export async function GET() {
  const { user, response } = await requireRole("ADMIN", "SALES_MANAGER", "FINANCE");
  if (response) return response;

  try {
    const [stalledDeals, discountAnomalies, anomalyMetrics] = await Promise.all([
      getStalledDeals(),
      getDiscountAnomalies(),
      getAnomalyMetrics(),
    ]);

    return NextResponse.json({
      success: true,
      data: serializeForApi({ stalledDeals, discountAnomalies, anomalyMetrics }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
