// src/lib/services/pricing.ts
// Spec §6.1 — all pricing math lives here.
// Money is always Prisma.Decimal. Never use JS number for money.
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";

export type DecimalInput = string | number | Prisma.Decimal;

export function dec(value: DecimalInput): Prisma.Decimal {
  return value instanceof Prisma.Decimal
    ? value
    : new Prisma.Decimal(String(value));
}

/** Round a Decimal to 2 decimal places (half-up). */
export function round2(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export interface PricingLine {
  productId: string;
  qty: number;
  unitPrice: DecimalInput;
  discountPct: DecimalInput; // percent, 0–100
  unitCost: DecimalInput;
  billingType: string;
  taxPercentage?: DecimalInput;
}

export interface PricingTotals {
  subtotal: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  totalCost: Prisma.Decimal;
  marginAmount: Prisma.Decimal;
  marginPercentage: Prisma.Decimal;
  lineTotals: Prisma.Decimal[];
}

/** lineTotal = unitPrice * qty * (1 - discountPct/100) * (1 + taxPercentage/100), rounded to 2dp */
export function computeLineTotal(
  unitPrice: DecimalInput,
  qty: number,
  discountPct: DecimalInput,
  taxPct: DecimalInput = 0
): Prisma.Decimal {
  const unit = dec(unitPrice);
  const disc = dec(discountPct);
  const tax = dec(taxPct);
  
  const subtotal = unit.times(qty);
  const discountAmt = subtotal.times(disc.dividedBy(100));
  const postDiscount = subtotal.minus(discountAmt);
  const taxAmt = postDiscount.times(tax.dividedBy(100));
  const lineTotal = postDiscount.plus(taxAmt);
  
  return round2(lineTotal);
}

const ZERO = new Prisma.Decimal(0);

/**
 * Compute quote-level totals from a set of pricing lines (§6.1):
 */
export function computeTotals(lines: PricingLine[]): PricingTotals {
  let subtotal = ZERO;
  let discountAmount = ZERO;
  let taxAmount = ZERO;
  let totalAmount = ZERO;
  let totalCost = ZERO;
  const lineTotals: Prisma.Decimal[] = [];

  for (const line of lines) {
    const subtotalLine = dec(line.unitPrice).times(line.qty);
    const discLine = subtotalLine.times(dec(line.discountPct).dividedBy(100));
    const postDisc = subtotalLine.minus(discLine);
    const taxLine = postDisc.times(dec(line.taxPercentage ?? 0).dividedBy(100));
    const totalLine = postDisc.plus(taxLine);
    const costLine = dec(line.unitCost).times(line.qty);
    
    subtotal = subtotal.plus(subtotalLine);
    discountAmount = discountAmount.plus(discLine);
    taxAmount = taxAmount.plus(taxLine);
    totalAmount = totalAmount.plus(totalLine);
    totalCost = totalCost.plus(costLine);
    lineTotals.push(round2(totalLine));
  }

  const marginAmount = subtotal.minus(discountAmount).minus(totalCost);
  const netRevenue = subtotal.minus(discountAmount);
  const marginPercentage = netRevenue.greaterThan(ZERO)
    ? marginAmount.dividedBy(netRevenue).times(100)
    : ZERO;

  return {
    subtotal: round2(subtotal),
    discountAmount: round2(discountAmount),
    taxAmount: round2(taxAmount),
    totalAmount: round2(totalAmount),
    totalCost: round2(totalCost),
    marginAmount: round2(marginAmount),
    marginPercentage: round2(marginPercentage),
    lineTotals,
  };
}

export interface QuoteTotalsPersist {
  subtotal: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  totalCost: Prisma.Decimal;
  marginAmount: Prisma.Decimal;
  marginPercentage: Prisma.Decimal;
}

/**
 * Re-read a quote with its lines and recompute persisted totals.
 * Returns the data payload to pass to prisma.quote.update.
 */
export async function computeQuoteTotals(quotationId: string): Promise<QuoteTotalsPersist> {
  const quote = await prisma.quote.findUnique({
    where: { id: quotationId },
    include: { lines: { include: { product: true } } },
  });
  if (!quote) throw new Error(`Quote ${quotationId} not found`);

  const pricingLines: PricingLine[] = quote.lines.map((l) => ({
    productId: l.productId,
    qty: l.qty,
    unitPrice: l.unitPrice,
    discountPct: l.discountPct,
    unitCost: l.product.unitCost,
    taxPercentage: l.product.taxRate,
    billingType: l.product?.billingType ?? "ONE_TIME",
  }));

  const totals = computeTotals(pricingLines);
  return {
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount,
    taxAmount: totals.taxAmount,
    totalAmount: totals.totalAmount,
    totalCost: totals.totalCost,
    marginAmount: totals.marginAmount,
    marginPercentage: totals.marginPercentage,
  };
}