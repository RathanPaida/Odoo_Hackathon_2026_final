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
  subscriptionMonths?: number | null;
}

export interface PricingTotals {
  subtotal: Prisma.Decimal;
  discountTotal: Prisma.Decimal;
  taxTotal: Prisma.Decimal;
  grandTotal: Prisma.Decimal;
  blendedDiscountPct: Prisma.Decimal;
  marginPct: Prisma.Decimal;
  lineTotals: Prisma.Decimal[];
}

/** lineTotal = unitPrice * qty * (1 - discountPct/100), rounded to 2dp */
export function computeLineTotal(
  unitPrice: DecimalInput,
  qty: number,
  discountPct: DecimalInput
): Prisma.Decimal {
  const unit = dec(unitPrice);
  const disc = dec(discountPct);
  const lineTotal = unit.times(qty).times(new Prisma.Decimal(1).minus(disc.dividedBy(100)));
  return round2(lineTotal);
}

const ZERO = new Prisma.Decimal(0);

/**
 * Compute quote-level totals from a set of pricing lines (§6.1):
 *   subtotal         = Σ unitPrice*qty
 *   discountTotal    = subtotal - Σ lineTotal
 *   blendedDiscountPct = discountTotal / subtotal * 100
 *   marginPct        = (Σ lineTotal - Σ unitCost*qty) / Σ lineTotal * 100
 */
export function computeTotals(lines: PricingLine[]): PricingTotals {
  let subtotal = ZERO;
  let lineTotalSum = ZERO;
  let costSum = ZERO;
  const lineTotals: Prisma.Decimal[] = [];

  for (const line of lines) {
    const subtotalLine = dec(line.unitPrice).times(line.qty);
    const lineTotal = computeLineTotal(line.unitPrice, line.qty, line.discountPct);
    const costLine = dec(line.unitCost).times(line.qty);
    subtotal = subtotal.plus(subtotalLine);
    lineTotalSum = lineTotalSum.plus(lineTotal);
    costSum = costSum.plus(costLine);
    lineTotals.push(lineTotal);
  }

  const discountTotal = subtotal.minus(lineTotalSum);
  const blendedDiscountPct = subtotal.greaterThan(ZERO)
    ? discountTotal.dividedBy(subtotal).times(100)
    : ZERO;
  const marginPct = lineTotalSum.greaterThan(ZERO)
    ? lineTotalSum.minus(costSum).dividedBy(lineTotalSum).times(100)
    : ZERO;

  const grandTotal = round2(lineTotalSum);
  const taxTotal = ZERO; // no tax model in scope

  return {
    subtotal: round2(subtotal),
    discountTotal: round2(discountTotal),
    taxTotal,
    grandTotal,
    blendedDiscountPct: round2(blendedDiscountPct),
    marginPct: round2(marginPct),
    lineTotals,
  };
}

export interface QuoteTotalsPersist {
  subtotal: Prisma.Decimal;
  discountTotal: Prisma.Decimal;
  taxTotal: Prisma.Decimal;
  grandTotal: Prisma.Decimal;
  blendedDiscountPct: Prisma.Decimal;
  marginPct: Prisma.Decimal;
}

/**
 * Re-read a quote with its lines and recompute persisted totals.
 * Returns the data payload to pass to prisma.quote.update.
 */
export async function computeQuoteTotals(quoteId: string): Promise<QuoteTotalsPersist> {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { lines: { include: { product: true } } },
  });
  if (!quote) throw new Error(`Quote ${quoteId} not found`);

  const pricingLines: PricingLine[] = quote.lines.map((l) => ({
    productId: l.productId,
    qty: l.qty,
    unitPrice: l.unitPrice,
    discountPct: l.discountPct,
    unitCost: l.product.unitCost,
    billingType: l.billingType,
    subscriptionMonths: l.subscriptionMonths,
  }));

  const totals = computeTotals(pricingLines);
  return {
    subtotal: totals.subtotal,
    discountTotal: totals.discountTotal,
    taxTotal: totals.taxTotal,
    grandTotal: totals.grandTotal,
    blendedDiscountPct: totals.blendedDiscountPct,
    marginPct: totals.marginPct,
  };
}