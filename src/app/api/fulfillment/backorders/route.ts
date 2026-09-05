export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { fulfillmentService } from "@/lib/services/fulfillment.service";
import { apiError, apiSuccess } from "@/lib/api-response";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get("status") || "BACKORDERED";
    const backorders = await prisma.allocation.findMany({
      where: { status: status as any },
      include: { quoteLine: { include: { product: true } } },
    });
    return apiSuccess(backorders);
  } catch (error: any) {
    return apiError("FETCH_FAILED", error.message || "Failed to fetch backorders.", 500);
  }
}
