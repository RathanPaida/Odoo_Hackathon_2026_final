// src/lib/services/order.ts
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { transitionQuotation } from "./quotation";
import { writeAudit } from "@/lib/audit";

export async function convertQuoteToOrder(quotationId: string, actorId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quotationId },
    include: { lines: { include: { product: true } } },
  });

  if (!quote) throw new Error("Quote not found");
  if (quote.status !== "APPROVED") throw new Error("Only APPROVED quotes can be confirmed");

  // Generate order number O-YYYYMMDD-XXXX
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomStr = Math.floor(1000 + Math.random() * 9000).toString();
  const orderNumber = `O-${dateStr}-${randomStr}`;

  let newOrder: Awaited<ReturnType<typeof prisma.order.create>> | undefined;

  // Transaction to ensure atomicity
  await prisma.$transaction(async (tx) => {
    // 1. Create the Order
    newOrder = await tx.order.create({
      data: {
        orderNumber,
        quotationId: quote.id,
        customerId: quote.customerId,
        status: "CONFIRMED",
        subtotal: quote.subtotal,
        taxAmount: quote.taxTotal,
        totalAmount: quote.grandTotal,
        currency: quote.currency,
      },
    });

    // 2. Create the OrderLines
    const orderLinesData = quote.lines.map((line) => ({
      orderId: newOrder!.id,
      productId: line.productId,
      quantity: line.qty,
      unitPrice: line.unitPrice,
      taxAmount: new Prisma.Decimal(0),
      totalAmount: line.lineTotal,
      productType: line.billingType,
    }));

    await tx.orderLine.createMany({
      data: orderLinesData,
    });
  });

  // 3. Transition Quote to CONFIRMED
  await transitionQuotation(quotationId, "CONFIRM", actorId);

  await writeAudit({
    entityType: "Order",
    entityId: newOrder!.id,
    action: "CREATED",
    actorId,
    after: newOrder,
  });

  return newOrder;
}
