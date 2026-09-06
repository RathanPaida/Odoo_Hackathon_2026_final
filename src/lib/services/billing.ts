// src/lib/services/billing.ts
// Spec §16 — hybrid billing: one-time invoice + recurring subscription schedule.
// Money is always Prisma.Decimal. Never use JS number for money.
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { computeProration } from "./subscription";

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
  amount: Prisma.Decimal;
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

/**
 * Create an invoice for a confirmed quote.
 * Handles both one-time lines and prorated recurring first-period lines per Spec §6.4 & §16.
 */
export async function createOneTimeInvoice(
  quoteId: string,
  dueDays: number = 30
): Promise<CreateInvoiceResult> {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      lines: {
        include: { product: true },
      },
      customer: true,
    },
  });

  if (!quote) throw new Error(`Quote ${quoteId} not found`);
  if (quote.lines.length === 0) throw new Error("No lines to invoice");

  // Check if invoice already exists for this quote
  const existing = await prisma.invoice.findUnique({ where: { quoteId } });
  if (existing) {
    return {
      invoiceId: existing.id,
      invoiceNumber: existing.invoiceNumber,
      amount: existing.amount,
      dueDate: existing.dueAt,
      lineItems: [],
    };
  }

  const oneTimeLines = quote.lines.filter(
    (line) => line.billingType === "ONE_TIME"
  );
  const recurringLines = quote.lines.filter(
    (line) => line.billingType === "RECURRING"
  );

  const lineItems: InvoiceLineItem[] = [];
  let totalAmount = new Prisma.Decimal(0);
  let subtotalAmount = new Prisma.Decimal(0);
  const now = new Date();

  // 1. One-time items
  for (const line of oneTimeLines) {
    const lineTotal = dec(line.lineTotal);
    totalAmount = totalAmount.plus(lineTotal);
    subtotalAmount = subtotalAmount.plus(dec(line.unitPrice).times(line.qty));

    lineItems.push({
      description: line.product.name,
      productId: line.productId,
      quantity: line.qty,
      unitPrice: line.unitPrice,
      taxAmount: new Prisma.Decimal(0),
      totalAmount: lineTotal,
    });
  }

  // 2. Spec §6.4: Recurring lines prorated first amount included on initial invoice
  for (const line of recurringLines) {
    const monthlyAmt = dec(line.lineTotal);
    const proratedFirst = computeProration(monthlyAmt, now);
    totalAmount = totalAmount.plus(proratedFirst);
    subtotalAmount = subtotalAmount.plus(proratedFirst);

    lineItems.push({
      description: `${line.product.name} (First Month Proration)`,
      productId: line.productId,
      quantity: 1,
      unitPrice: proratedFirst,
      taxAmount: new Prisma.Decimal(0),
      totalAmount: proratedFirst,
    });
  }

  // If quote only had recurring or zero amount, ensure at least grandTotal or prorated
  if (totalAmount.isZero() && quote.grandTotal && !dec(quote.grandTotal).isZero()) {
    totalAmount = dec(quote.grandTotal);
    subtotalAmount = dec(quote.subtotal);
  }

  const roundedAmount = round2(totalAmount);
  const roundedSubtotal = round2(subtotalAmount);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + dueDays);

  const invoice = await prisma.invoice.create({
    data: {
      quote: { connect: { id: quoteId } },
      customer: { connect: { id: quote.customerId } },
      invoiceNumber: generateInvoiceNumber(),
      amount: roundedAmount,
      subtotal: roundedSubtotal,
      taxAmount: quote.taxTotal || new Prisma.Decimal(0),
      dueAt: dueDate,
      lines: {
        create: lineItems.map((item) => ({
          description: item.description,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: dec(item.unitPrice),
          taxAmount: dec(item.taxAmount),
          totalAmount: dec(item.totalAmount),
        })),
      },
    },
  });

  await writeAudit({
    entityType: "Invoice",
    entityId: invoice.id,
    action: "CREATED_ONE_TIME",
    before: undefined,
    after: { quoteId, invoiceNumber: invoice.invoiceNumber, amount: roundedAmount.toString() },
  });

  return {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    amount: roundedAmount,
    dueDate,
    lineItems,
  };
}

export async function getInvoiceById(invoiceId: string) {
  return prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      quote: {
        include: {
          customer: true,
          lines: { include: { product: true } },
        },
      },
      lines: true,
      customer: true,
    },
  });
}

export async function getInvoiceByQuoteId(quoteId: string) {
  return prisma.invoice.findUnique({
    where: { quoteId },
    include: {
      quote: {
        include: {
          customer: true,
          lines: { include: { product: true } },
        },
      },
      lines: true,
      customer: true,
    },
  });
}

export async function listInvoices(options: {
  limit?: number;
  offset?: number;
  status?: string;
}) {
  const { limit = 50, offset = 0, status } = options;

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where: status ? { status: status as Prisma.EnumInvoiceStatusFilter<"Invoice"> | undefined } : undefined,
      include: {
        quote: {
          include: { customer: true },
        },
        lines: true,
        customer: true,
      },
      orderBy: { issuedAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.invoice.count({
      where: status ? { status: status as Prisma.EnumInvoiceStatusFilter<"Invoice"> | undefined } : undefined,
    }),
  ]);

  return { invoices, total };
}

export async function cancelInvoice(invoiceId: string, reason?: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);

  await prisma.invoice.update({ 
    where: { id: invoiceId },
    data: { status: "CANCELLED" }
  });

  await writeAudit({
    entityType: "Invoice",
    entityId: invoiceId,
    action: "CANCELLED",
    before: { invoiceNumber: invoice.invoiceNumber, amount: invoice.amount.toString(), status: invoice.status },
    after: { reason, status: "CANCELLED" },
  });

  return { cancelled: true };
}
