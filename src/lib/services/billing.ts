// src/lib/services/billing.ts
// Spec §16 — hybrid billing: one-time invoice + recurring subscription schedule.
// Money is always Prisma.Decimal. Never use JS number for money.
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export type DecimalInput = string | number | Prisma.Decimal;

export function dec(value: DecimalInput): Prisma.Decimal {
  return value instanceof Prisma.Decimal
    ? value
    : new Prisma.Decimal(String(value));
}

export function round2(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export interface InvoiceLineItem {
  description: string;
  productId: string;
  quantity: number;
  unitPrice: DecimalInput;
  taxAmount: DecimalInput;
  totalAmount: DecimalInput;
}

export interface CreateInvoiceResult {
  invoiceId: string;
  invoiceNumber: string;
  invoiceType: string;
  subtotal: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  dueDate: Date;
  lineItems: InvoiceLineItem[];
}

function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `INV-${year}${month}-${random}`;
}

export async function createOneTimeInvoice(
  orderId: string,
  dueDays: number = 30
): Promise<CreateInvoiceResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      lines: {
        where: { productType: "ONE_TIME" },
        include: { product: true },
      },
      customer: true,
    },
  });

  if (!order) throw new Error(`Order ${orderId} not found`);
  if (order.lines.length === 0) throw new Error("No one-time lines to invoice");

  const lineItems: InvoiceLineItem[] = [];
  let subtotal = new Prisma.Decimal(0);
  let taxAmount = new Prisma.Decimal(0);

  for (const line of order.lines) {
    const totalAmount = dec(line.totalAmount);
    const taxLine = new Prisma.Decimal(0);
    subtotal = subtotal.plus(totalAmount);
    taxAmount = taxAmount.plus(taxLine);

    lineItems.push({
      description: line.product.name,
      productId: line.productId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      taxAmount: taxLine,
      totalAmount,
    });
  }

  const totalAmount = round2(subtotal.plus(taxAmount));
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + dueDays);

  const invoice = await prisma.invoice.create({
    data: {
      orderId,
      customerId: order.customerId,
      invoiceNumber: generateInvoiceNumber(),
      totalAmount: totalAmount,
      subtotal: round2(subtotal),
      taxAmount: round2(taxAmount),
      dueDate: dueDate,
      status: "ISSUED",
      invoiceType: "ONE_TIME",
    },
  });

  for (const item of lineItems) {
    await prisma.invoiceLine.create({
      data: {
        invoiceId: invoice.id,
        description: item.description,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxAmount: item.taxAmount,
        totalAmount: item.totalAmount,
      },
    });
  }

  await writeAudit({
    entityType: "Invoice",
    entityId: invoice.id,
    action: "CREATED_ONE_TIME",
    before: undefined,
    after: { orderId, invoiceNumber: invoice.invoiceNumber, amount: totalAmount.toString() },
  });

  return {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    invoiceType: "ONE_TIME",
    subtotal: round2(subtotal),
    taxAmount: round2(taxAmount),
    totalAmount,
    dueDate,
    lineItems,
  };
}

export async function recordPayment(
  invoiceId: string,
  amount: DecimalInput,
  paymentMethod: string,
  transactionReference?: string
): Promise<{ paymentId: string; invoiceStatus: string }> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
  });
  if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);

  const paidAmount = dec(amount);

  const payment = await prisma.payment.create({
    data: {
      invoiceId,
      customerId: invoice.customerId,
      amount: paidAmount,
      paymentMethod,
      status: "SUCCESS",
      transactionReference,
      paidAt: new Date(),
    },
  });

  // Calculate total paid amounts from payments since `paidAmount` doesn't exist on invoice
  const payments = await prisma.payment.findMany({
    where: { invoiceId, status: "SUCCESS" }
  });
  const newPaidAmount = payments.reduce((acc, p) => acc.plus(p.amount), new Prisma.Decimal(0));
  const isFullyPaid = newPaidAmount.greaterThanOrEqualTo(invoice.totalAmount);
  const newStatus = isFullyPaid ? "PAID" : "PARTIALLY_PAID";

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: newStatus },
  });

  await writeAudit({
    entityType: "Payment",
    entityId: payment.id,
    action: "PAYMENT_RECEIVED",
    before: undefined,
    after: { invoiceId, amount: paidAmount.toString(), method: paymentMethod },
  });

  return { paymentId: payment.id, invoiceStatus: newStatus };
}

export async function getInvoiceById(invoiceId: string) {
  return prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      lines: true,
      payments: true,
    },
  });
}

export async function listInvoices(options: {
  customerId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const { customerId, status, limit = 50, offset = 0 } = options;

  const where: Record<string, unknown> = {};
  if (customerId) where.customerId = customerId;
  if (status) where.status = status;

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.invoice.count({ where }),
  ]);

  return { invoices, total };
}

export async function cancelInvoice(invoiceId: string, reason?: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);
  if (invoice.status === "PAID") {
    throw new Error("Cannot cancel a fully paid invoice");
  }

  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "CANCELLED" },
  });

  await writeAudit({
    entityType: "Invoice",
    entityId: invoiceId,
    action: "CANCELLED",
    before: { status: invoice.status },
    after: { status: "CANCELLED", reason },
  });

  return updated;
}
