export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { validatePortalToken } from "@/lib/services/portal";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { transitionQuotation } from "@/lib/services/quotation";
import { getApprovalClient } from "@/lib/services/approval-client";
import { computeQuoteTotals } from "@/lib/services/pricing";
import { serializeForApi } from "@/lib/api-response";

/**
 * POST /api/portal/:token/negotiate
 * Handles customer negotiation requests:
 * - Quantity change on a line
 * - Counter discount on a line
 * - Product change request (comment-based, no auto-swap)
 *
 * On any financial change:
 * 1. Update the quotation line
 * 2. Recalculate quote totals
 * 3. Set status NEGOTIATING
 * 4. Re-trigger approval evaluation via Person 2's endpoint
 * 5. Apply the returned status via transitionQuotation()
 *
 * Body: {
 *   type: "QTY_CHANGE" | "COUNTER_DISCOUNT" | "PRODUCT_CHANGE",
 *   lineId: string,
 *   content: string,
 *   requestedQty?: number,
 *   requestedDiscount?: number,
 * }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const quoteRef = await validatePortalToken(token);
  if (!quoteRef) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Invalid or expired link." } },
      { status: 401 }
    );
  }

  // Only allow negotiation on quotes that are APPROVED or NEGOTIATING
  if (quoteRef.status !== "APPROVED" && quoteRef.status !== "NEGOTIATING") {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_STATE", message: `Cannot negotiate a quote in ${quoteRef.status} status.` } },
      { status: 400 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON" } },
      { status: 400 }
    );
  }

  const { type, lineId, content, requestedQty, requestedDiscount } = body;

  if (!type || !lineId || !content) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "type, lineId, and content are required" } },
      { status: 422 }
    );
  }

  // Verify line belongs to this quote
  const line = await prisma.quoteLine.findFirst({
    where: { id: lineId, quoteId: quoteRef.id },
    include: { product: true },
  });

  if (!line) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Line does not belong to this quote" } },
      { status: 422 }
    );
  }

  let financialChange = false;
  const metadata: Record<string, any> = {};

  // 1. Handle the specific negotiation type
  switch (type) {
    case "QTY_CHANGE": {
      if (!requestedQty || requestedQty < 1) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: "requestedQty must be >= 1" } },
          { status: 422 }
        );
      }

      metadata.previousQty = line.qty;
      metadata.requestedQty = requestedQty;

      // Update the line quantity and recalculate lineTotal
      const newLineTotal = new Prisma.Decimal(line.unitPrice.toString())
        .mul(requestedQty)
        .mul(new Prisma.Decimal(1).sub(line.discountPct.div(100)));

      await prisma.quoteLine.update({
        where: { id: lineId },
        data: {
          qty: requestedQty,
          lineTotal: newLineTotal,
        },
      });

      financialChange = true;
      break;
    }

    case "COUNTER_DISCOUNT": {
      if (requestedDiscount === undefined || requestedDiscount < 0 || requestedDiscount > 100) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: "requestedDiscount must be between 0 and 100" } },
          { status: 422 }
        );
      }

      metadata.previousDiscount = Number(line.discountPct);
      metadata.requestedDiscount = requestedDiscount;

      // Update the line discount and recalculate lineTotal
      const discountDec = new Prisma.Decimal(requestedDiscount);
      const newTotal = new Prisma.Decimal(line.unitPrice.toString())
        .mul(line.qty)
        .mul(new Prisma.Decimal(1).sub(discountDec.div(100)));

      await prisma.quoteLine.update({
        where: { id: lineId },
        data: {
          discountPct: discountDec,
          lineTotal: newTotal,
        },
      });

      financialChange = true;
      break;
    }

    case "PRODUCT_CHANGE": {
      // Product change is comment-only — the sales rep decides whether to swap
      metadata.productName = line.product.name;
      metadata.requestedChange = content;
      break;
    }

    default:
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "type must be QTY_CHANGE, COUNTER_DISCOUNT, or PRODUCT_CHANGE" } },
        { status: 422 }
      );
  }

  // 2. Create the negotiation comment (audit trail)
  const comment = await prisma.negotiationComment.create({
    data: {
      quoteId: quoteRef.id,
      customerId: quoteRef.customerId,
      lineId,
      content: content.trim(),
      commentType: type,
      metadata,
    },
  });

  // 3. If financial terms changed, recalculate totals + re-trigger approval
  if (financialChange) {
    // Recalculate quote-level totals
    await computeQuoteTotals(quoteRef.id);

    // Increment reapprovalCount
    await prisma.quote.update({
      where: { id: quoteRef.id },
      data: {
        reapprovalCount: { increment: 1 },
        lastActivityAt: new Date(),
      },
    });

    // Transition to NEGOTIATING first
    await transitionQuotation(quoteRef.id, "NEGOTIATE", quoteRef.customerId);

    // Re-trigger approval evaluation (§19: PERSON 1 calls PERSON 2's evaluate endpoint)
    const approvalClient = getApprovalClient();
    const evaluation = await approvalClient.evaluate(quoteRef.id);

    // Apply the returned status via transitionQuotation()
    const finalStatus = evaluation.status === "REVISION_REQUIRED" ? "REJECTED" : evaluation.status;
    await transitionQuotation(quoteRef.id, "SUBMIT", quoteRef.customerId, finalStatus);

    // If approval is required, create the Approval record
    if (evaluation.requiresApproval) {
      const quote = await prisma.quote.findUnique({ where: { id: quoteRef.id } });
      await prisma.approval.create({
        data: {
          quoteId: quoteRef.id,
          requiredRole: evaluation.level === "FINANCE" ? "FINANCE" : "SALES_MANAGER",
          status: "PENDING",
          reason: evaluation.reason,
          cycle: (quote?.reapprovalCount || 0) + 1,
        },
      });
    }
  } else {
    // Non-financial change (e.g., product change request) — just transition to NEGOTIATING
    await transitionQuotation(quoteRef.id, "NEGOTIATE", quoteRef.customerId);
    await prisma.quote.update({
      where: { id: quoteRef.id },
      data: { lastActivityAt: new Date() },
    });
  }

  // Re-fetch the updated quote to return current state
  const updatedQuote = await prisma.quote.findUnique({
    where: { id: quoteRef.id },
    select: { status: true, grandTotal: true, subtotal: true, discountTotal: true, taxTotal: true, reapprovalCount: true },
  });

  return NextResponse.json({
    success: true,
    data: {
      comment: serializeForApi(comment),
      quote: serializeForApi(updatedQuote),
    },
  });
}
