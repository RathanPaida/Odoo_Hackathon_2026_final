// src/app/api/quotes/[id]/submit/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/rbac";
import { transitionQuotation } from "@/lib/services/quotation";
import { getApprovalClient } from "@/lib/services/approval-client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireRole("SALES_REP", "SALES_MANAGER");
  if (response) return response;

  const { id: quoteId } = await params;

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { lines: true },
  });

  if (!quote) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Quote not found" } },
      { status: 404 }
    );
  }

  if (quote.lines.length === 0) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_STATE", message: "Cannot submit an empty quote" } },
      { status: 400 }
    );
  }

  // 1. Call Person 2's approval engine
  const approvalClient = getApprovalClient();
  const evaluation = await approvalClient.evaluate(quoteId);

  // 2. Map evaluation status to QuoteStatus and transition
  const newStatus = evaluation.status; // Fortunately they map 1:1 except for REVISION_REQUIRED which we'll treat as REJECTED for now if it happens
  const finalStatus = newStatus === "REVISION_REQUIRED" ? "REJECTED" : newStatus;

  const updatedQuote = await transitionQuotation(quoteId, "SUBMIT", user!.id, finalStatus);

  // 3. If approval is required, create the Approval record (Person 2 would normally do this, 
  // but since we are mocking, we'll insert a basic one so the UI has something to show)
  if (evaluation.requiresApproval) {
    await prisma.approval.create({
      data: {
        quoteId,
        requiredRole: evaluation.level === "FINANCE" ? "FINANCE" : "SALES_MANAGER",
        status: "PENDING",
        reason: evaluation.reason,
        cycle: quote.reapprovalCount + 1,
      },
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      quote: updatedQuote,
      evaluation,
    },
  });
}
