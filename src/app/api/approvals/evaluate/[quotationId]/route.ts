export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { blendedRiskService } from "@/lib/services/blended-risk.service";
import { approvalFlowService } from "@/lib/services/approval-flow.service";
import { apiError, apiSuccess } from "@/lib/api-response";

interface Params {
  params: Promise<{ quotationId: string }>;
}

/**
 * CONTRACT SPECIFICATION §10:
 * POST /api/approvals/evaluate/:quotationId
 * Computes the blended discount risk score across all lines, applies category and tier ceilings,
 * returns evaluation outcome, and creates/updates an ApprovalRequest if required.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { quotationId } = await params;
    if (!quotationId) {
      return apiError("INVALID_QUOTATION_ID", "Quotation ID is required.", 400);
    }

    const { evaluation, approval } =
      await approvalFlowService.evaluateAndCreateRequest(quotationId);

    return apiSuccess({
      evaluation,
      approvalId: approval?.id ?? null,
    });
  } catch (error: any) {
    console.error("Evaluation Error:", error);
    return apiError("EVALUATION_FAILED", error.message || "Failed to evaluate quotation risk.", 400);
  }
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { quotationId } = await params;
    const evaluation = await blendedRiskService.evaluateQuotation(quotationId);
    return apiSuccess(evaluation);
  } catch (error: any) {
    return apiError("EVALUATION_FAILED", error.message || "Failed to evaluate quotation risk.", 400);
  }
}
