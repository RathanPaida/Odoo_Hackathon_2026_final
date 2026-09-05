export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { fulfillmentService, ProposedSplit } from "@/lib/services/fulfillment.service";
import { apiError, apiSuccess } from "@/lib/api-response";

/**
 * CONTRACT SPECIFICATION §15:
 * POST /api/fulfillment/override
 * Manual warehouse override with backend stock validation.
 * Rejects if proposed quantity exceeds usable stock in warehouse.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fulfillmentId = body.fulfillmentId;
    const proposedSplits = body.proposedSplits as ProposedSplit[];

    if (!fulfillmentId || !Array.isArray(proposedSplits)) {
      return apiError(
        "INVALID_INPUT",
        "fulfillmentId and proposedSplits array are required.",
        400
      );
    }

    const updatedFulfillment = await fulfillmentService.overrideFulfillment(
      fulfillmentId,
      proposedSplits
    );

    return apiSuccess(updatedFulfillment);
  } catch (error: any) {
    console.error("Override validation error:", error);
    return apiError("OVERRIDE_FAILED", error.message || "Manual override failed.", 400);
  }
}
