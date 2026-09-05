export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { fulfillmentService } from "@/lib/services/fulfillment.service";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { quoteLineId, warehouseId, requestedQty, allocationId } = body;

    if (!quoteLineId || !warehouseId || typeof requestedQty !== "number") {
      return apiError(
        "INVALID_INPUT",
        "quoteLineId, warehouseId, and numeric requestedQty are required.",
        400
      );
    }

    const result = await fulfillmentService.manualOverrideAllocation({
      allocationId,
      quoteLineId,
      warehouseId,
      requestedQty,
    });

    return apiSuccess(result);
  } catch (err: any) {
    console.error("Manual override error:", err);
    return apiError(
      "ALLOCATION_REJECTED",
      err.message || "Failed to override warehouse allocation.",
      400
    );
  }
}
