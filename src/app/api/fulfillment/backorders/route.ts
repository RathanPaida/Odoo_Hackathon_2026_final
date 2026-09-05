export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { fulfillmentService } from "@/lib/services/fulfillment.service";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get("status") || undefined;
    const backorders = await fulfillmentService.listBackorders(status);
    return apiSuccess(backorders);
  } catch (error: any) {
    return apiError("FETCH_FAILED", error.message || "Failed to fetch backorders.", 500);
  }
}
