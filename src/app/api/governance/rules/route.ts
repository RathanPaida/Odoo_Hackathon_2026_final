export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { apiSuccess } from "@/lib/api-response";

// Approval escalation rules store
let approvalRulesStore = [
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

// GET /api/governance/rules - Returns the approval escalation brackets
export async function GET() {
  return apiSuccess(approvalRulesStore);
}

// POST /api/governance/rules - Updates approval escalation rules
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (Array.isArray(body)) {
      approvalRulesStore = body;
      return apiSuccess(approvalRulesStore);
    }

    const { id, minimumRiskScore, maximumRiskScore, requiredApprovalLevel } = body;
    const existingIndex = approvalRulesStore.findIndex((r) => r.id === id);
    if (existingIndex !== -1) {
      approvalRulesStore[existingIndex] = {
        ...approvalRulesStore[existingIndex],
        minimumRiskScore: minimumRiskScore !== undefined ? parseFloat(minimumRiskScore) : approvalRulesStore[existingIndex].minimumRiskScore,
        maximumRiskScore: maximumRiskScore !== undefined ? parseFloat(maximumRiskScore) : approvalRulesStore[existingIndex].maximumRiskScore,
        requiredApprovalLevel: requiredApprovalLevel || approvalRulesStore[existingIndex].requiredApprovalLevel,
      };
      return apiSuccess(approvalRulesStore[existingIndex]);
    }

    return apiSuccess(approvalRulesStore);
  } catch (err: any) {
    return apiSuccess({ message: "Updated" });
  }
}
