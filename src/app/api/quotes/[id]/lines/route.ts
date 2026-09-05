// src/app/api/quotes/[id]/lines/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/rbac";
import { AddQuoteLineSchema } from "@/lib/contracts/quote";
import { recomputeQuotationTotals } from "@/lib/services/quotation";
import { writeAudit } from "@/lib/audit";
import { Prisma } from "@/generated/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireRole("SALES_REP", "SALES_MANAGER");
  if (response) return response;

  const { id: quoteId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON" } },
      { status: 400 }
    );
  }

  const parsed = AddQuoteLineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
      { status: 422 }
    );
  }

  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Quote not found" } },
      { status: 404 }
    );
  }

  if (quote.status !== "DRAFT" && quote.status !== "NEGOTIATING" && quote.status !== "REJECTED") {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_STATE", message: "Cannot modify quote in current state" } },
      { status: 400 }
    );
  }

  const product = await prisma.product.findUnique({ where: { id: parsed.data.productId } });
  if (!product) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Product not found" } },
      { status: 404 }
    );
  }

  // Add the line
  const line = await prisma.quoteLine.create({
    data: {
      quoteId,
      productId: product.id,
      qty: parsed.data.qty,
      unitPrice: product.listPrice, // We pull directly from product in this implementation
      discountPct: parsed.data.discountPct,
      lineTotal: new Prisma.Decimal(0), // Will be computed
      billingType: product.billingType,
      subscriptionMonths: parsed.data.subscriptionMonths,
    },
  });

  // Recompute quote totals
  const updatedQuote = await recomputeQuotationTotals(quoteId);

  await writeAudit({
    entityType: "QuoteLine",
    entityId: line.id,
    action: "CREATED",
    actorId: user!.id,
    after: line,
  });

  return NextResponse.json({ success: true, data: updatedQuote });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireRole("SALES_REP", "SALES_MANAGER");
  if (response) return response;

  const { id: quoteId } = await params;
  const url = new URL(req.url);
  const lineId = url.searchParams.get("lineId");

  if (!lineId) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Missing lineId" } },
      { status: 400 }
    );
  }

  const line = await prisma.quoteLine.findUnique({ where: { id: lineId }, include: { quote: true } });
  if (!line || line.quoteId !== quoteId) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Line not found" } },
      { status: 404 }
    );
  }

  if (line.quote.status !== "DRAFT" && line.quote.status !== "NEGOTIATING" && line.quote.status !== "REJECTED") {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_STATE", message: "Cannot modify quote in current state" } },
      { status: 400 }
    );
  }

  await prisma.quoteLine.delete({ where: { id: lineId } });

  // Recompute quote totals
  const updatedQuote = await recomputeQuotationTotals(quoteId);

  await writeAudit({
    entityType: "QuoteLine",
    entityId: lineId,
    action: "DELETED",
    actorId: user!.id,
    before: line,
  });

  return NextResponse.json({ success: true, data: updatedQuote });
}
