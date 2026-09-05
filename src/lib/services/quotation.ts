import { prisma } from "@/lib/db";
import { QuoteStatus, Prisma } from "@/generated/prisma";
import { writeAudit } from "@/lib/audit";

export type QuotationEvent = "SUBMIT" | "APPROVE" | "REJECT" | "NEGOTIATE" | "CONFIRM" | "CANCEL";

/**
 * The ONLY code path that writes Quote.status.
 * Person 1 owns this.
 */
export async function transitionQuotation(
  quoteId: string,
  event: QuotationEvent,
  actorId: string,
  newStatus?: QuoteStatus // For when an external system (like Approval Service) dictates the exact status
) {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) throw new Error("Quote not found");

  let nextStatus = quote.status;

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
      if (quote.status === "CONFIRMED" || quote.status === "CANCELLED") {
        throw new Error("Cannot negotiate a final quote");
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
      nextStatus = "CANCELLED";
      break;
  }

  const updated = await prisma.quote.update({
    where: { id: quoteId },
    data: { 
      status: nextStatus,
      lastActivityAt: new Date()
    },
  });

  await writeAudit({
    entityType: "Quote",
    entityId: quoteId,
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
export async function recomputeQuotationTotals(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { lines: { include: { product: true } } },
  });

  if (!quote) throw new Error("Quote not found");

  let subtotal = new Prisma.Decimal(0);
  let discountTotal = new Prisma.Decimal(0);
  let taxTotal = new Prisma.Decimal(0);
  let grandTotal = new Prisma.Decimal(0);
  let totalCost = new Prisma.Decimal(0);
  let marginAmount = new Prisma.Decimal(0);

  // Use a transaction to update lines and quote together
  await prisma.$transaction(async (tx) => {
    for (const line of quote.lines) {
      // line.unitPrice is listPrice, discountPct is applied to it
      const lineSubtotal = line.unitPrice.mul(line.qty);
      const discountAmt = lineSubtotal.mul(line.discountPct).div(100);
      const postDiscount = lineSubtotal.sub(discountAmt);
      const taxAmt = postDiscount.mul(line.product.taxRate).div(100);
      const lineTotal = postDiscount.add(taxAmt);
      const lineCost = line.product.unitCost.mul(line.qty);

      // Update line totals
      await tx.quoteLine.update({
        where: { id: line.id },
        data: {
          lineTotal: postDiscount, // Store post-discount amount in lineTotal for consistency with legacy schema
        },
      });

      subtotal = subtotal.add(lineSubtotal);
      discountTotal = discountTotal.add(discountAmt);
      taxTotal = taxTotal.add(taxAmt);
      grandTotal = grandTotal.add(lineTotal);
      totalCost = totalCost.add(lineCost);
    }

    marginAmount = subtotal.sub(discountTotal).sub(totalCost);
    
    // Calculate percentages safely
    const netRevenue = subtotal.sub(discountTotal);
    const blendedDiscountPct = subtotal.gt(0) 
      ? discountTotal.div(subtotal).mul(100) 
      : new Prisma.Decimal(0);
      
    const marginPct = netRevenue.gt(0)
      ? marginAmount.div(netRevenue).mul(100)
      : new Prisma.Decimal(0);

    await tx.quote.update({
      where: { id: quoteId },
      data: {
        subtotal,
        discountTotal,
        taxTotal,
        grandTotal,
        totalCost,
        marginAmount,
        blendedDiscountPct,
        marginPct,
        lastActivityAt: new Date(),
      },
    });
  });

  return prisma.quote.findUnique({ where: { id: quoteId } });
}
