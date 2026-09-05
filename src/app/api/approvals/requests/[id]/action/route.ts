export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { approvalFlowService } from "@/lib/services/approval-flow.service";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/session";
import { ApprovalActionType, Role } from "@/generated/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * CONTRACT SPECIFICATION §14:
 * POST /api/approvals/requests/:id/action
 * Appends to append-only ApprovalAction audit history, updates request status,
 * escalates from MANAGER to FINANCE if needed.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();

    const action = body.action as ApprovalActionType;
    if (!action || !Object.values(ApprovalActionType).includes(action)) {
      return apiError(
        "INVALID_ACTION",
        `Action must be one of: ${Object.values(ApprovalActionType).join(", ")}`,
        400
      );
    }

    const user = await getCurrentUser();
    const actorId = user?.id ?? body.actorId ?? "demo-approver-user";

    // Enforce role authorization if user session is present
    if (user && user.role !== Role.ADMIN) {
      const existing = await approvalFlowService.getApprovalRequest(id);
      if (existing && existing.assignedRole !== user.role) {
        return apiError(
          "FORBIDDEN",
          `This approval request is assigned to ${existing.assignedRole}, but your role is ${user.role}.`,
          403
        );
      }
    }

    const result = await approvalFlowService.recordAction({
      approvalRequestId: id,
      actorId,
      action,
      reason: body.reason,
    });

    return apiSuccess({
      approvalRequestId: id,
      action: result.action.action,
      status: result.approvalRequest.status,
      assignedRole: result.approvalRequest.assignedRole,
      level: result.approvalRequest.level,
      timestamp: result.action.timestamp,
    });
  } catch (error: any) {
    console.error("Action error:", error);
    return apiError("ACTION_FAILED", error.message || "Failed to record approval action.", 400);
  }
}
