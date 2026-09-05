export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { fulfillmentService } from "@/lib/services/fulfillment.service";
import { apiError, apiSuccess } from "@/lib/api-response";

/**
 * CONTRACT SPECIFICATION §15:
 * POST /api/fulfillment/allocate
 * Multi-warehouse allocation algorithm:
 * Scores warehouses based on stock, distance, shipping base cost, and shipment consolidation penalty.
 * Allocates greedily, reserves stock, creates Backorders for remainder.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.quoteId) {
      return apiError("INVALID_INPUT", "quoteId is required.", 400);
    }

    const allocationResult = await fulfillmentService.allocateQuote(
      body.quoteId
    );

    return apiSuccess(allocationResult);
  } catch (error: any) {
    console.error("Allocation error:", error);
    return apiError("ALLOCATION_FAILED", error.message || "Failed to allocate fulfillment.", 400);
  }
}
