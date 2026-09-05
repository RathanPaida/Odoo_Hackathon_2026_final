import { prisma } from "@/lib/db";
import {
  ApprovalActionType,
  ApprovalLevel,
  ApprovalOutcome,
  Role,
  Prisma,
} from "@/generated/prisma";
import { blendedRiskService, EvaluationResult } from "./blended-risk.service";
import { toDecimal } from "@/lib/api-response";

export interface TakeActionInput {
  approvalRequestId: string;
  actorId: string;
  action: ApprovalActionType;
  reason?: string;
}

export const approvalFlowService = {
  /**
   * Evaluate a quotation and initialize/update an ApprovalRequest if required.
   */
  async evaluateAndCreateRequest(quotationId: string): Promise<{
    evaluation: EvaluationResult;
    approvalRequest: any | null;
  }> {
    const evaluation = await blendedRiskService.evaluateQuotation(quotationId);

    if (!evaluation.requiresApproval) {
      return { evaluation, approvalRequest: null };
    }

    // Determine starting role
    const assignedRole =
      evaluation.level === ApprovalLevel.MANAGER
        ? Role.SALES_MANAGER
        : Role.FINANCE;

    // Check if there is an existing pending request for this quotation
    const existing = await prisma.approvalRequest.findFirst({
      where: {
        quotationId,
        status: ApprovalOutcome.PENDING_APPROVAL,
      },
      orderBy: { createdAt: "desc" },
    });

    let approvalRequest;
    if (existing) {
      approvalRequest = await prisma.approvalRequest.update({
        where: { id: existing.id },
        data: {
          level: evaluation.level,
          assignedRole,
          riskScore: toDecimal(evaluation.riskScore),
          reason: evaluation.reason,
          status: ApprovalOutcome.PENDING_APPROVAL,
        },
      });
    } else {
      approvalRequest = await prisma.approvalRequest.create({
        data: {
          quotationId,
          level: evaluation.level,
          status: ApprovalOutcome.PENDING_APPROVAL,
          assignedRole,
          riskScore: toDecimal(evaluation.riskScore),
          reason: evaluation.reason,
        },
      });
    }

    return { evaluation, approvalRequest };
  },

  /**
   * List approval requests for manager/finance dashboard inbox.
   */
  async listApprovalRequests(filter?: {
    assignedRole?: Role;
    status?: ApprovalOutcome;
    quotationId?: string;
  }) {
    return prisma.approvalRequest.findMany({
      where: {
        ...(filter?.assignedRole ? { assignedRole: filter.assignedRole } : {}),
        ...(filter?.status ? { status: filter.status } : {}),
        ...(filter?.quotationId ? { quotationId: filter.quotationId } : {}),
      },
      include: {
        actions: {
          orderBy: { timestamp: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getApprovalRequest(id: string) {
    const request = await prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        actions: {
          orderBy: { timestamp: "desc" },
        },
      },
    });

    if (!request) return null;

    // Load related quotation info and recalculate breakdown for the inspector UI
    let evaluation: EvaluationResult | null = null;
    let quotation: any = null;
    try {
      evaluation = await blendedRiskService.evaluateQuotation(request.quotationId);
      quotation = await prisma.quotation.findUnique({
        where: { id: request.quotationId },
        include: {
          customer: true,
          lines: {
            include: {
              product: true,
            },
          },
        },
      });
    } catch {
      // Quotation may not exist in standalone mock
    }

    return {
      ...request,
      evaluation,
      quotation,
    };
  },

  /**
   * Records an append-only action and advances the approval workflow.
   * Never updates or deletes existing ApprovalAction records!
   */
  async recordAction(input: TakeActionInput) {
    const { approvalRequestId, actorId, action, reason } = input;

    const request = await prisma.approvalRequest.findUnique({
      where: { id: approvalRequestId },
      include: {
        actions: true,
      },
    });

    if (!request) {
      throw new Error(`ApprovalRequest '${approvalRequestId}' not found.`);
    }

    if (request.status !== ApprovalOutcome.PENDING_APPROVAL) {
      throw new Error(`ApprovalRequest is already in status '${request.status}' and cannot be modified.`);
    }

    // Append-only write to ApprovalAction table
    const recordedAction = await prisma.approvalAction.create({
      data: {
        approvalRequestId,
        actorId,
        action,
        reason: reason ?? null,
      },
    });

    let newStatus: ApprovalOutcome = request.status;
    let newLevel: ApprovalLevel = request.level;
    let newAssignedRole: Role = request.assignedRole;

    if (action === ApprovalActionType.APPROVE) {
      // Check if Manager approved and Finance is also required
      if (request.level === ApprovalLevel.FINANCE && request.assignedRole === Role.SALES_MANAGER) {
        // Manager approved first level -> escalate to Finance!
        newAssignedRole = Role.FINANCE;
        newStatus = ApprovalOutcome.PENDING_APPROVAL;
      } else {
        // Final approval granted
        newStatus = ApprovalOutcome.APPROVED;
      }
    } else if (action === ApprovalActionType.REJECT) {
      newStatus = ApprovalOutcome.REJECTED;
    } else if (action === ApprovalActionType.REQUEST_REVISION) {
      newStatus = ApprovalOutcome.REVISION_REQUIRED;
    }

    const updatedRequest = await prisma.approvalRequest.update({
      where: { id: approvalRequestId },
      data: {
        status: newStatus,
        level: newLevel,
        assignedRole: newAssignedRole,
      },
      include: {
        actions: {
          orderBy: { timestamp: "desc" },
        },
      },
    });

    return {
      action: recordedAction,
      approvalRequest: updatedRequest,
    };
  },
};
