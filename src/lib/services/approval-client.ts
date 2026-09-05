// src/lib/services/approval-client.ts
// Mock Approval Service Client (Person 2's domain)

export type ApprovalEvaluation = {
  quotationId: string;
  requiresApproval: boolean;
  riskScore: number;
  level: "NONE" | "MANAGER" | "FINANCE";
  status: "PENDING_APPROVAL" | "APPROVED" | "REVISION_REQUIRED" | "REJECTED";
  reason?: string;
};

export interface ApprovalClient {
  evaluate(quotationId: string): Promise<ApprovalEvaluation>;
}

export const mockApprovalClient: ApprovalClient = {
  async evaluate(quotationId) {
    // In a real implementation, this would call Person 2's endpoint
    // POST /api/approvals/evaluate/:quotationId

    // For now, return a mock response that forces MANAGER approval
    return {
      quotationId,
      requiresApproval: true,
      riskScore: 65,
      level: "MANAGER",
      status: "PENDING_APPROVAL",
      reason: "Mock response: Blended risk score exceeds tier threshold",
    };
  },
};

export function getApprovalClient(): ApprovalClient {
  // If we had a real implementation, we could toggle it here based on process.env.USE_MOCK_APPROVALS
  return mockApprovalClient;
}
