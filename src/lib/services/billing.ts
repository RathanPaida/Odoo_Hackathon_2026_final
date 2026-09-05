// src/lib/services/billing.ts
// Spec §16 — hybrid billing: one-time invoice + recurring subscription schedule.
// Money is always Prisma.Decimal. Never use JS number for money.
import { Prisma, InvoiceStatus as PrismaInvoiceStatus } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { InvoiceStatus } from "@/lib/contracts/billing";

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
  quoteId: string,
  dueDays: number = 30
): Promise<CreateInvoiceResult> {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      lines: {
        where: { billingType: "ONE_TIME" },
        include: { product: true },
      },
      customer: true,
    },
  });

  if (!quote) throw new Error(`Quote ${quoteId} not found`);
  if (quote.lines.length === 0) throw new Error("No one-time lines to invoice");

  const lineItems: InvoiceLineItem[] = [];
  let subtotal = new Prisma.Decimal(0);
  let taxAmount = new Prisma.Decimal(0);

  for (const line of quote.lines) {
    const totalAmount = dec(line.lineTotal);
    const taxLine = new Prisma.Decimal(0);
    subtotal = subtotal.plus(totalAmount);
    taxAmount = taxAmount.plus(taxLine);

    lineItems.push({
      description: line.product.name,
      productId: line.productId,
      quantity: line.qty,
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
      quoteId,
      customerId: quote.customerId,
      invoiceNumber: generateInvoiceNumber(),
      amount: totalAmount,
      subtotal: round2(subtotal),
      taxAmount: round2(taxAmount),
      issuedAt: new Date(),
      dueAt: dueDate,
      status: PrismaInvoiceStatus.ISSUED,
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
    after: { quoteId, invoiceNumber: invoice.invoiceNumber, amount: totalAmount.toString() },
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
    include: { customer: true },
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

  const newPaidAmount = (invoice.paidAmount ?? new Prisma.Decimal(0)).plus(paidAmount);
  const isFullyPaid = newPaidAmount.greaterThanOrEqualTo(invoice.amount);
  const newStatus = isFullyPaid ? PrismaInvoiceStatus.PAID : PrismaInvoiceStatus.PARTIALLY_PAID;

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { paidAmount: newPaidAmount, status: newStatus },
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
      quote: { include: { customer: true } },
      subscriptions: true,
    },
  });
}

export async function listInvoices(options: {
  customerId?: string;
  status?: InvoiceStatus;
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
      include: {
        quote: { include: { customer: true } },
        subscriptions: true,
      },
      orderBy: { issuedAt: "desc" },
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
  if (invoice.status === PrismaInvoiceStatus.PAID) {
    throw new Error("Cannot cancel a fully paid invoice");
  }

  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: PrismaInvoiceStatus.CANCELLED },
  });

  await writeAudit({
    entityType: "Invoice",
    entityId: invoiceId,
    action: "CANCELLED",
    before: { status: invoice.status },
    after: { status: PrismaInvoiceStatus.CANCELLED, reason },
  });

  return updated;
}
