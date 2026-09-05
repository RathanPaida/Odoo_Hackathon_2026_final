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
    const statusParam = searchParams.get("status") as ApprovalStatus | null;
    const quotationIdParam = searchParams.get("quotationId");

    let requiredRole: Role | undefined = undefined;
    if (assignedRoleParam) {
      requiredRole = assignedRoleParam;
    } else if (user && (user.role === Role.SALES_MANAGER || user.role === Role.FINANCE)) {
      requiredRole = user.role;
    }

    const requests = await approvalFlowService.listApprovals({
      status: statusParam || undefined,
      requiredRole,
      quoteId: quotationIdParam || undefined,
    });

    return apiSuccess(requests);
  } catch (error: any) {
    return apiError("FETCH_FAILED", error.message || "Failed to fetch approvals.", 500);
  }
}
