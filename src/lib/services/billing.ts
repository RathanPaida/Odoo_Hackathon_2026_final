// src/lib/services/billing.ts
// Spec §16 — hybrid billing: one-time invoice + recurring subscription schedule.
// Money is always Prisma.Decimal. Never use JS number for money.
//
// Uses generated Prisma client types.
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
 * Invoice is tied to Quote via quoteId (unique).
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

  // TEST 18 & 19: Only ONE_TIME lines go into the initial one-time invoice.
  // Future recurring subscription charges must NOT be in the one-time invoice.
  const oneTimeLines = quote.lines.filter(
    (line) => line.billingType === "ONE_TIME"
  );

  const lineItems: InvoiceLineItem[] = [];
  let totalAmount = new Prisma.Decimal(0);

  for (const line of oneTimeLines) {
    const lineTotal = dec(line.lineTotal);
    totalAmount = totalAmount.plus(lineTotal);

    lineItems.push({
      description: line.product.name,
      productId: line.productId,
      quantity: line.qty,
      unitPrice: line.unitPrice,
      taxAmount: new Prisma.Decimal(0),
      totalAmount: lineTotal,
    });
  }

  const roundedAmount = round2(totalAmount);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + dueDays);

  const invoice = await prisma.invoice.create({
    data: {
      quote: { connect: { id: quoteId } },
      customer: { connect: { id: quote.customerId } },
      invoiceNumber: generateInvoiceNumber(),
      amount: roundedAmount,
      dueAt: dueDate,
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
        },
      },
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

  // Setting status to CANCELLED since generated client supports it
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
