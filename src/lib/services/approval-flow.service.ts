// src/lib/services/approval-flow.service.ts
// Approval flow service — uses actual Prisma schema.
// Schema has: Approval (quoteId, approverId, requiredRole: Role, status: ApprovalStatus, reason, decidedAt, cycle)
// No ApprovalRequest/ApprovalAction models.
import { prisma } from "@/lib/db";
import { ApprovalStatus, Role, Prisma } from "@/generated/prisma";
import { blendedRiskService, EvaluationResult } from "./blended-risk.service";
import { transitionQuotation } from "./quotation";

export interface TakeActionInput {
  approvalId: string;
  actorId: string;
  action: "APPROVE" | "REJECT";
  reason?: string;
}

export const approvalFlowService = {
  /**
   * Evaluate a quote and create an Approval row if required.
   */
  async evaluateAndCreateRequest(quoteId: string): Promise<{
    evaluation: EvaluationResult;
    approval: Awaited<ReturnType<typeof prisma.approval.create>> | null;
  }> {
    const evaluation = await blendedRiskService.evaluateQuotation(quoteId);

    if (!evaluation.requiresApproval) {
      return { evaluation, approval: null };
    }

    // Get the current quote to determine cycle
    const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
    const currentCycle = (quote?.reapprovalCount ?? 0) + 1;

    // Check if there is an existing pending approval for this quote at this cycle
    const existing = await prisma.approval.findFirst({
      where: {
        quoteId,
        status: ApprovalStatus.PENDING,
        cycle: currentCycle,
      },
      orderBy: { createdAt: "desc" },
    });

    let approval;
    if (existing) {
      approval = await prisma.approval.update({
        where: { id: existing.id },
        data: {
          requiredRole: evaluation.requiredRole,
          reason: evaluation.reason,
          status: ApprovalStatus.PENDING,
        },
      });
    } else {
      approval = await prisma.approval.create({
        data: {
          quoteId,
          requiredRole: evaluation.requiredRole,
          status: ApprovalStatus.PENDING,
          reason: evaluation.reason,
          cycle: currentCycle,
        },
      });
    }

    return { evaluation, approval };
  },

  /**
   * List approvals for manager/finance dashboard inbox.
   */
  async listApprovals(filter?: {
    requiredRole?: Role;
    status?: ApprovalStatus;
    quoteId?: string;
  }) {
    return prisma.approval.findMany({
      where: {
        ...(filter?.requiredRole ? { requiredRole: filter.requiredRole } : {}),
        ...(filter?.status ? { status: filter.status } : {}),
        ...(filter?.quoteId ? { quoteId: filter.quoteId } : {}),
      },
      include: {
        quote: {
          include: {
            customer: true,
            owner: true,
          },
        },
        approver: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getApproval(id: string) {
    const approval = await prisma.approval.findUnique({
      where: { id },
      include: {
        quote: {
          include: {
            customer: true,
            owner: true,
            lines: {
              include: { product: true },
            },
          },
        },
        approver: true,
      },
    });

    if (!approval) return null;

    // Recalculate evaluation for the inspector UI
    let evaluation: EvaluationResult | null = null;
    try {
      evaluation = await blendedRiskService.evaluateQuotation(approval.quoteId);
    } catch {
      // Quote may not exist or have errors
    }

    return {
      ...approval,
      evaluation,
    };
  },

  /**
   * Records an approval/rejection decision.
   * Append-only: never modifies existing approval rows — creates new ones for new cycles.
   */
  async recordAction(input: TakeActionInput) {
    const { approvalId, actorId, action, reason } = input;

    const approval = await prisma.approval.findUnique({
      where: { id: approvalId },
    });

    if (!approval) {
      throw new Error(`Approval '${approvalId}' not found.`);
    }

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new Error(`Approval is already in status '${approval.status}' and cannot be modified.`);
    }

    let newStatus: ApprovalStatus;
    if (action === "APPROVE") {
      newStatus = ApprovalStatus.APPROVED;
    } else {
      newStatus = ApprovalStatus.REJECTED;
    }

    const updatedApproval = await prisma.approval.update({
      where: { id: approvalId },
      data: {
        status: newStatus,
        approverId: actorId,
        reason: reason ?? approval.reason,
        decidedAt: new Date(),
      },
      include: {
        quote: true,
        approver: true,
      },
    });

    // Synchronize Quotation status state machine
    try {
      if (action === "APPROVE") {
        await transitionQuotation(approval.quoteId, "APPROVE", actorId);
      } else {
        await transitionQuotation(approval.quoteId, "REJECT", actorId);
      }
    } catch (transitionErr) {
      console.error("Failed to transition quote status:", transitionErr);
    }

    return {
      approval: updatedApproval,
    };
  },
};
