export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { governanceService } from "@/lib/services/governance.service";
import { apiError, apiSuccess } from "@/lib/api-response";
import { ApprovalLevel } from "@/generated/prisma";

export async function GET() {
  try {
    const rules = await governanceService.listApprovalRules();
    return apiSuccess(rules);
  } catch (error: any) {
    return apiError("FETCH_FAILED", error.message || "Failed to fetch approval rules.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (
      body.minimumRiskScore === undefined ||
      body.maximumRiskScore === undefined ||
      !body.requiredApprovalLevel
    ) {
      return apiError(
        "INVALID_INPUT",
        "minimumRiskScore, maximumRiskScore, and requiredApprovalLevel are required.",
        400
      );
    }
    const rule = await governanceService.createApprovalRule({
      minimumRiskScore: body.minimumRiskScore,
      maximumRiskScore: body.maximumRiskScore,
      requiredApprovalLevel: body.requiredApprovalLevel as ApprovalLevel,
      active: body.active,
    });
    return apiSuccess(rule, 201);
  } catch (error: any) {
    return apiError("CREATE_FAILED", error.message || "Failed to create approval rule.", 400);
  }
}
