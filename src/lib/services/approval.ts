// src/lib/services/approval.ts
// Spec §6.2 — approval workflow. All transitions write an AuditLog row
// and enqueue a state-changed job (worker runs anomaly detection).
import { ApprovalStatus, Prisma, Quote, Role, QuoteStatus } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { computeQuoteTotals } from "@/lib/services/pricing";
import { evaluateDiscountRouting, loadDiscountRules, ROLE_RANK } from "@/lib/services/discount";
import { enqueueQuoteStateChanged } from "@/lib/services/queue";
import { RequiredRoleError, ApproverLimitError } from "@/lib/services/errors";

export interface RoutingOutcome {
  status: QuoteStatus;
  approvalCreated: boolean;
  requiredRole?: Role;
}

/**
 * §6.2 submit/counter-offer routing:
 *  - recompute totals
 *  - evaluate per-line + blended discount governance
 *  - either auto-approve or create a new Approval row at the next cycle
 * Writes the status transition + audit, then enqueues anomaly scan.
 */
export async function routeQuoteForApproval(
  quoteId: string,
  actorId: string
): Promise<RoutingOutcome> {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { customer: true },
  });
  if (!quote) throw new Error(`Quote ${quoteId} not found`);
  if (quote.status !== QuoteStatus.DRAFT && quote.status !== QuoteStatus.NEGOTIATING) {
    throw new Error(
      `Quote cannot be submitted from status ${quote.status}`
    );
  }

  const totals = await computeQuoteTotals(quoteId);

  const lines = await prisma.quoteLine.findMany({
    where: { quoteId },
    include: { product: true },
  });

  const rules = await loadDiscountRules(quote.customer.tier, lines.map((l: { product: { category: any; }; }) => l.product.category));

  const decision = evaluateDiscountRouting({
    customerTier: quote.customer.tier,
    lines: lines.map((l: { product: { category: any; }; discountPct: any; }) => ({
      productCategory: l.product.category,
      discountPct: l.discountPct,
    })),
    blendedDiscountPct: totals.blendedDiscountPct,
    rules,
  });

  const before = capture(quote);
  let approvalCreated = false;

  if (decision.autoApprove) {
    await prisma.quote.update({
      where: { id: quoteId },
      data: { ...totals, status: QuoteStatus.APPROVED },
    });
  } else {
    const nextCycle = quote.reapprovalCount + 1;
    await prisma.$transaction([
      prisma.quote.update({
        where: { id: quoteId },
        data: { ...totals, status: QuoteStatus.PENDING_APPROVAL },
      }),
      prisma.approval.create({
        data: {
          quoteId,
          requiredRole: decision.requiredRole,
          status: ApprovalStatus.PENDING,
          cycle: nextCycle,
        },
      }),
    ]);
    approvalCreated = true;
  }

  const after = capture(await prisma.quote.findUnique({ where: { id: quoteId } }));
  await writeAudit({
    entityType: "Quote",
    entityId: quoteId,
    action: decision.autoApprove ? "AUTO_APPROVED" : "SUBMITTED_FOR_APPROVAL",
    actorId,
    before,
    after,
  });

  await enqueueQuoteStateChanged(quoteId);

  return {
    status: decision.autoApprove ? QuoteStatus.APPROVED : QuoteStatus.PENDING_APPROVAL,
    approvalCreated,
    requiredRole: decision.autoApprove ? undefined : decision.requiredRole,
  };
}

// ─── Approve / reject ─────────────────────────────────────────────────────────

export interface ApproveResult {
  quoteId: string;
  status: QuoteStatus;
}

/** §6.2 approve — verifies role and approval limit from DB, never JWT. */
export async function approveQuote(
  quoteId: string,
  approver: { id: string; role: Role; approvalLimitPct: Prisma.Decimal }
): Promise<ApproveResult> {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { approvals: { orderBy: { cycle: "desc" } } },
  });
  if (!quote) throw new Error(`Quote ${quoteId} not found`);
  if (quote.status !== QuoteStatus.PENDING_APPROVAL && quote.status !== QuoteStatus.NEGOTIATING) {
    throw new Error(`Quote is not pending approval (status ${quote.status})`);
  }

  const pending = quote.approvals.find((a: { status: any; }) => a.status === ApprovalStatus.PENDING);
  if (!pending) throw new Error("No pending approval for this quote.");

  if (!isApproverRole(approver.role, pending.requiredRole)) {
    throw new RequiredRoleError(pending.requiredRole);
  }

  // Authority check against the database value (§6.2).
  if (approver.approvalLimitPct.lt(quote.blendedDiscountPct)) {
    throw new ApproverLimitError(
      quote.blendedDiscountPct,
      approver.approvalLimitPct
    );
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.approval.update({
      where: { id: pending.id },
      data: { status: ApprovalStatus.APPROVED, approverId: approver.id, decidedAt: now },
    }),
    prisma.quote.update({ where: { id: quoteId }, data: { status: QuoteStatus.APPROVED } }),
  ]);

  await writeAudit({
    entityType: "Quote",
    entityId: quoteId,
    action: "APPROVED",
    actorId: approver.id,
    before: { status: quote.status },
    after: { status: QuoteStatus.APPROVED, cycle: pending.cycle },
  });

  await enqueueQuoteStateChanged(quoteId);

  return { quoteId, status: QuoteStatus.APPROVED };
}

export async function rejectQuote(
  quoteId: string,
  approver: { id: string; role: Role },
  reason: string
): Promise<ApproveResult> {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { approvals: { orderBy: { cycle: "desc" } } },
  });
  if (!quote) throw new Error(`Quote ${quoteId} not found`);
  if (quote.status !== QuoteStatus.PENDING_APPROVAL && quote.status !== QuoteStatus.NEGOTIATING) {
    throw new Error(`Quote is not pending approval (status ${quote.status})`);
  }

  const pending = quote.approvals.find((a: { status: any; }) => a.status === ApprovalStatus.PENDING);
  if (!pending) throw new Error("No pending approval for this quote.");

  if (!isApproverRole(approver.role, pending.requiredRole)) {
    throw new RequiredRoleError(pending.requiredRole);
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.approval.update({
      where: { id: pending.id },
      data: {
        status: ApprovalStatus.REJECTED,
        approverId: approver.id,
        decidedAt: now,
        reason,
      },
    }),
    prisma.quote.update({ where: { id: quoteId }, data: { status: QuoteStatus.REJECTED } }),
  ]);

  await writeAudit({
    entityType: "Quote",
    entityId: quoteId,
    action: "REJECTED",
    actorId: approver.id,
    before: { status: quote.status },
    after: { status: QuoteStatus.REJECTED, cycle: pending.cycle, reason },
  });

  await enqueueQuoteStateChanged(quoteId);

  return { quoteId, status: QuoteStatus.REJECTED };
}

/** A role may approve if it equals the required role (or is ADMIN). */
export function isApproverRole(role: Role, requiredRole: Role): boolean {
  if (requiredRole === Role.ADMIN) return role === Role.ADMIN || ROLE_RANK[role] > ROLE_RANK[requiredRole];
  return role === requiredRole || role === Role.ADMIN;
}

function capture(q: Quote | null) {
  if (!q) return undefined;
  return {
    status: q.status,
    grandTotal: q.grandTotal,
    blendedDiscountPct: q.blendedDiscountPct,
    reapprovalCount: q.reapprovalCount,
  };
}