export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { approvalFlowService } from "@/lib/services/approval-flow.service";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/session";
import { ApprovalStatus, Role } from "@/generated/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();

    const action = body.action as "APPROVE" | "REJECT";
    if (!action || !["APPROVE", "REJECT"].includes(action)) {
      return apiError(
        "INVALID_ACTION",
        `Action must be one of: APPROVE, REJECT`,
        400
      );
    }

    const user = await getCurrentUser();
    const actorId = user?.id ?? body.actorId ?? "demo-approver-user";

    // Enforce role authorization if user session is present
    if (user && user.role !== Role.ADMIN) {
      const existing = await approvalFlowService.getApproval(id);
      if (existing && existing.requiredRole !== user.role) {
        return apiError(
          "FORBIDDEN",
          `This approval is assigned to ${existing.requiredRole}, but your role is ${user.role}.`,
          403
        );
      }
    }

    const result = await approvalFlowService.recordAction({
      approvalId: id,
      actorId,
      action,
      reason: body.reason,
    });

    return apiSuccess({
      approvalId: id,
      status: result.approval.status,
      requiredRole: result.approval.requiredRole,
    });
  } catch (error: any) {
    console.error("Action error:", error);
    return apiError("ACTION_FAILED", error.message || "Failed to record approval action.", 400);
  }
}

