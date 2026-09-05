export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { apiSuccess } from "@/lib/api-response";

// GET /api/governance/rules - Returns the approval escalation brackets
export async function GET() {
  const data = [
    {
      id: "rule-auto",
      minimumRiskScore: 0.0,
      maximumRiskScore: 0.0,
      requiredApprovalLevel: "NONE",
      description: "Risk score 0 (within all tier and category ceilings)",
    },
    {
      id: "rule-manager",
      minimumRiskScore: 0.01,
      maximumRiskScore: 5.0,
      requiredApprovalLevel: "MANAGER",
      description: "Risk score > 0 to 5 (requires Sales Manager sign-off)",
    },
    {
      id: "rule-finance",
      minimumRiskScore: 5.01,
      maximumRiskScore: 100.0,
      requiredApprovalLevel: "FINANCE",
      description: "Risk score > 5 to 100 (requires Finance Director sign-off)",
    },
  ];

  return apiSuccess(data);
}

export async function POST(req: NextRequest) {
  return apiSuccess({ message: "Approval rules matrix is active" });
}
