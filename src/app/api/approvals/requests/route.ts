export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { approvalFlowService } from "@/lib/services/approval-flow.service";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/session";
import { ApprovalStatus, Role } from "@/generated/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const searchParams = req.nextUrl.searchParams;

    const assignedRoleParam = searchParams.get("role") as Role | null;
    const statusParam = searchParams.get("status");
    const quotationIdParam = searchParams.get("quotationId");

    let status: ApprovalStatus | undefined = undefined;
    if (statusParam) {
      if (statusParam === "PENDING_APPROVAL" || statusParam === ApprovalStatus.PENDING) {
        status = ApprovalStatus.PENDING;
      } else if (statusParam in ApprovalStatus) {
        status = statusParam as ApprovalStatus;
      }
    }

    let requiredRole: Role | undefined = undefined;
    if (assignedRoleParam && (assignedRoleParam as string) !== "ALL") {
      requiredRole = assignedRoleParam;
    }

    const requests = await approvalFlowService.listApprovals({
      status,
      requiredRole,
      quoteId: quotationIdParam || undefined,
    });

    return apiSuccess(requests);
  } catch (error: any) {
    return apiError("FETCH_FAILED", error.message || "Failed to fetch approvals.", 500);
  }
}
