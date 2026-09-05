export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { approvalFlowService } from "@/lib/services/approval-flow.service";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/session";
import { ApprovalOutcome, Role } from "@/generated/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const searchParams = req.nextUrl.searchParams;

    const assignedRoleParam = searchParams.get("role") as Role | null;
    const statusParam = searchParams.get("status") as ApprovalOutcome | null;
    const quotationIdParam = searchParams.get("quotationId");

    // Optional default filter by user's role if not explicitly requested
    let assignedRole: Role | undefined = undefined;
    if (assignedRoleParam) {
      assignedRole = assignedRoleParam;
    } else if (user && (user.role === Role.SALES_MANAGER || user.role === Role.FINANCE)) {
      assignedRole = user.role;
    }

    const requests = await approvalFlowService.listApprovalRequests({
      assignedRole,
      status: statusParam ?? undefined,
      quotationId: quotationIdParam ?? undefined,
    });

    return apiSuccess(requests);
  } catch (error: any) {
    return apiError("FETCH_FAILED", error.message || "Failed to list approval requests.", 500);
  }
}
