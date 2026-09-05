export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { approvalFlowService } from "@/lib/services/approval-flow.service";
import { apiError, apiSuccess } from "@/lib/api-response";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const approvalRequest = await approvalFlowService.getApproval(id);
    if (!approvalRequest) {
      return apiError("NOT_FOUND", `ApprovalRequest '${id}' not found.`, 404);
    }
    return apiSuccess(approvalRequest);
  } catch (error: any) {
    return apiError("FETCH_FAILED", error.message || "Failed to fetch approval request.", 500);
  }
}
