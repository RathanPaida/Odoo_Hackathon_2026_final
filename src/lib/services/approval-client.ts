import { blendedRiskService } from "./blended-risk.service";

export type ApprovalEvaluation = {
  quotationId: string;
  requiresApproval: boolean;
  riskScore: number;
  level: "NONE" | "MANAGER" | "FINANCE";
  status: "PENDING_APPROVAL" | "APPROVED" | "REVISION_REQUIRED" | "REJECTED";
  reason?: string;
  breakdown?: any[];
};

export interface ApprovalClient {
  evaluate(quotationId: string): Promise<ApprovalEvaluation>;
}

export const realApprovalClient: ApprovalClient = {
  async evaluate(quotationId: string): Promise<ApprovalEvaluation> {
    const result = await blendedRiskService.evaluateQuotation(quotationId);
    
    let levelMapped: "NONE" | "MANAGER" | "FINANCE" = "NONE";
    if (result.level === "SALES_MANAGER") levelMapped = "MANAGER";
    else if (result.level === "FINANCE") levelMapped = "FINANCE";

    return {
      quotationId,
      requiresApproval: result.requiresApproval,
      riskScore: result.riskScore,
      level: levelMapped,
      status: result.status,
      reason: result.reason,
      breakdown: result.breakdown,
    };
  },
};

export function getApprovalClient(): ApprovalClient {
  return realApprovalClient;
}
