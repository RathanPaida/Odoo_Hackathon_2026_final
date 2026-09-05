import { prisma } from "@/lib/db";
import { QuotationStatus, Prisma } from "@/generated/prisma";
import { writeAudit } from "@/lib/audit";

export type QuotationEvent = "SUBMIT" | "APPROVE" | "REJECT" | "NEGOTIATE" | "CONFIRM" | "CANCEL";

/**
 * The ONLY code path that writes Quotation.status.
 * Person 1 owns this.
 */
export async function transitionQuotation(
  quotationId: string,
  event: QuotationEvent,
  actorId: string,
  newStatus?: QuotationStatus // For when an external system (like Approval Service) dictates the exact status
) {
  const quotation = await prisma.quotation.findUnique({ where: { id: quotationId } });
  if (!quotation) throw new Error("Quotation not found");

  let nextStatus = quotation.status;

  switch (event) {
    case "SUBMIT":
      if (quotation.status !== "DRAFT" && quotation.status !== "REJECTED" && quotation.status !== "UNDER_NEGOTIATION") {
        throw new Error("Can only submit from DRAFT, REJECTED, or UNDER_NEGOTIATION");
      }
      nextStatus = newStatus || "PENDING_APPROVAL";
      break;
    
    case "APPROVE":
      if (quotation.status !== "PENDING_APPROVAL") {
        throw new Error("Can only approve from PENDING_APPROVAL");
      }
      nextStatus = "APPROVED";
      break;

    case "REJECT":
      if (quotation.status !== "PENDING_APPROVAL") {
        throw new Error("Can only reject from PENDING_APPROVAL");
      }
      nextStatus = "REJECTED";
      break;

    case "NEGOTIATE":
      if (quotation.status === "CONFIRMED" || quotation.status === "CANCELLED") {
        throw new Error("Cannot negotiate a final quotation");
      }
      nextStatus = "UNDER_NEGOTIATION";
      break;

    case "CONFIRM":
      if (quotation.status !== "APPROVED") {
        throw new Error("Can only confirm from APPROVED");
      }
      nextStatus = "CONFIRMED";
      break;

    case "CANCEL":
      nextStatus = "CANCELLED";
      break;
  }

  const updated = await prisma.quotation.update({
    where: { id: quotationId },
    data: { 
      status: nextStatus,
      lastActivityAt: new Date()
    },
  });

  await writeAudit({
    entityType: "Quotation",
    entityId: quotationId,
    action: `TRANSITION_${event}`,
    actorId,
    before: { status: quotation.status },
    after: { status: nextStatus },
  });

  return updated;
}

/**
 * Recomputes all line-level and order-level totals for a quotation.
 */
export async function recomputeQuotationTotals(quotationId: string) {
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: { lines: { include: { product: true } } },
  });

  if (!quotation) throw new Error("Quotation not found");

  let subtotal = new Prisma.Decimal(0);
  let discountAmount = new Prisma.Decimal(0);
  let taxAmount = new Prisma.Decimal(0);
  let totalAmount = new Prisma.Decimal(0);
  let totalCost = new Prisma.Decimal(0);
  let marginAmount = new Prisma.Decimal(0);

  // Use a transaction to update lines and quotation together
  await prisma.$transaction(async (tx) => {
    for (const line of quotation.lines) {
      // line.unitPrice is listPrice, discountPercentage is applied to it
      const lineSubtotal = line.unitPrice.mul(line.quantity);
      const lineDiscountAmt = lineSubtotal.mul(line.discountPercentage).div(100);
      const postDiscount = lineSubtotal.sub(lineDiscountAmt);
      const lineTaxAmt = postDiscount.mul(line.taxPercentage).div(100);
      const lineTotal = postDiscount.add(lineTaxAmt);
      const lineCost = line.costPrice.mul(line.quantity);
      const lineMargin = postDiscount.sub(lineCost);

      // Update line totals
      await tx.quotationLine.update({
        where: { id: line.id },
        data: {
          discountAmount: lineDiscountAmt,
          taxAmount: lineTaxAmt,
          lineSubtotal,
          lineTotal,
          lineMargin,
        },
      });

      subtotal = subtotal.add(lineSubtotal);
      discountAmount = discountAmount.add(lineDiscountAmt);
      taxAmount = taxAmount.add(lineTaxAmt);
      totalAmount = totalAmount.add(lineTotal);
      totalCost = totalCost.add(lineCost);
    }

    marginAmount = subtotal.sub(discountAmount).sub(totalCost);
    
    // Calculate percentages safely
    const netRevenue = subtotal.sub(discountAmount);
      
    const marginPercentage = netRevenue.gt(0)
      ? marginAmount.div(netRevenue).mul(100)
      : new Prisma.Decimal(0);

    await tx.quotation.update({
      where: { id: quotationId },
      data: {
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount,
        totalCost,
        marginAmount,
        marginPercentage,
        lastActivityAt: new Date(),
      },
    });
  });

  return prisma.quotation.findUnique({ where: { id: quotationId } });
}
