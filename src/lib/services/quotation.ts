// src/lib/services/quotation.ts
// Person 1 — Quotation state machine and totals recomputation.
// Uses the actual Prisma schema models: Quote, QuoteLine, QuoteStatus.
import { prisma } from "@/lib/db";
import { QuoteStatus, Prisma } from "@/generated/prisma";
import { writeAudit } from "@/lib/audit";

export type QuotationEvent = "SUBMIT" | "APPROVE" | "REJECT" | "NEGOTIATE" | "CONFIRM" | "CANCEL";

/**
 * The ONLY code path that writes Quote.status.
 * Person 1 owns this.
 */
export async function transitionQuotation(
  quotationId: string,
  event: QuotationEvent,
  actorId: string,
  newStatus?: QuoteStatus // For when an external system (like Approval Service) dictates the exact status
) {
  const quote = await prisma.quote.findUnique({ where: { id: quotationId } });
  if (!quote) throw new Error("Quotation not found");

  let nextStatus: QuoteStatus = quote.status;

  switch (event) {
    case "SUBMIT":
      if (quote.status !== "DRAFT" && quote.status !== "REJECTED" && quote.status !== "NEGOTIATING") {
        throw new Error("Can only submit from DRAFT, REJECTED, or NEGOTIATING");
      }
      nextStatus = newStatus || "PENDING_APPROVAL";
      break;
    
    case "APPROVE":
      if (quote.status !== "PENDING_APPROVAL") {
        throw new Error("Can only approve from PENDING_APPROVAL");
      }
      nextStatus = "APPROVED";
      break;

    case "REJECT":
      if (quote.status !== "PENDING_APPROVAL") {
        throw new Error("Can only reject from PENDING_APPROVAL");
      }
      nextStatus = "REJECTED";
      break;

    case "NEGOTIATE":
      if (quote.status === "CONFIRMED") {
        throw new Error("Cannot negotiate a final quotation");
      }
      nextStatus = "NEGOTIATING";
      break;

    case "CONFIRM":
      if (quote.status !== "APPROVED") {
        throw new Error("Can only confirm from APPROVED");
      }
      nextStatus = "CONFIRMED";
      break;

    case "CANCEL":
      // Cancel is always allowed — but schema doesn't have CANCELLED.
      // Treat as REJECTED for now since schema has no CANCELLED status.
      nextStatus = "REJECTED";
      break;
  }

  const updated = await prisma.quote.update({
    where: { id: quotationId },
    data: { 
      status: nextStatus,
      lastActivityAt: new Date()
    },
  });

  await writeAudit({
    entityType: "Quote",
    entityId: quotationId,
    action: `TRANSITION_${event}`,
    actorId,
    before: { status: quote.status },
    after: { status: nextStatus },
  });

  return updated;
}

/**
 * Recomputes all line-level and order-level totals for a quote.
 */
export async function recomputeQuotationTotals(quotationId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quotationId },
    include: { lines: { include: { product: true } } },
  });

  if (!quote) throw new Error("Quotation not found");

  let subtotal = new Prisma.Decimal(0);
  let discountTotal = new Prisma.Decimal(0);
  let taxTotal = new Prisma.Decimal(0);
  let grandTotal = new Prisma.Decimal(0);
  let totalCost = new Prisma.Decimal(0);

  // Use a transaction to update lines and quote together
  await prisma.$transaction(async (tx) => {
    for (const line of quote.lines) {
      // lineTotal = unitPrice * qty * (1 - discountPct/100)
      const lineSubtotal = line.unitPrice.mul(line.qty);
      const lineDiscountAmt = lineSubtotal.mul(line.discountPct).div(100);
      const postDiscount = lineSubtotal.sub(lineDiscountAmt);
      const lineTaxAmt = postDiscount.mul(line.product.taxRate).div(100);
      const lineTotal = postDiscount.add(lineTaxAmt);
      const lineCost = line.product.unitCost.mul(line.qty);

      // Update line totals
      await tx.quoteLine.update({
        where: { id: line.id },
        data: {
          lineTotal: lineTotal,
        },
      });

      subtotal = subtotal.add(lineSubtotal);
      discountTotal = discountTotal.add(lineDiscountAmt);
      taxTotal = taxTotal.add(lineTaxAmt);
      grandTotal = grandTotal.add(lineTotal);
      totalCost = totalCost.add(lineCost);
    }

    const marginAmount = subtotal.sub(discountTotal).sub(totalCost);
    
    // Calculate percentages safely
    const netRevenue = subtotal.sub(discountTotal);
      
    const marginPct = netRevenue.gt(0)
      ? marginAmount.div(netRevenue).mul(100)
      : new Prisma.Decimal(0);

    const blendedDiscountPct = subtotal.gt(0)
      ? discountTotal.div(subtotal).mul(100)
      : new Prisma.Decimal(0);

    await tx.quote.update({
      where: { id: quotationId },
      data: {
        subtotal,
        discountTotal,
        taxTotal,
        grandTotal,
        totalCost,
        marginAmount,
        marginPct,
        blendedDiscountPct,
        lastActivityAt: new Date(),
      },
    });
  });

  return prisma.quote.findUnique({ where: { id: quotationId } });
}
