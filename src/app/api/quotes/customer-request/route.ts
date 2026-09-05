export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/rbac";
import { recomputeQuotationTotals } from "@/lib/services/quotation";
import { generatePortalToken } from "@/lib/services/portal";
import { writeAudit } from "@/lib/audit";
import { Prisma } from "@/generated/prisma";
import { apiSuccess, apiError, serializeForApi } from "@/lib/api-response";
import { z } from "zod";

const CustomerRequestQuoteSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Product is required"),
        qty: z.number().int().positive("Quantity must be greater than 0"),
        subscriptionMonths: z.number().int().positive().optional(),
      })
    )
    .min(1, "At least one item is required"),
  notes: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;

  if (user!.role !== "CUSTOMER") {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Only customers can use this endpoint." } },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON format" } },
      { status: 400 }
    );
  }

  const parsed = CustomerRequestQuoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.errors[0]?.message || "Invalid input data",
        },
      },
      { status: 422 }
    );
  }

  // 1. Resolve customer profile for current user
  let customer = await prisma.customer.findFirst({
    where: { email: user!.email },
  });

  if (!customer) {
    // If not found by email, find by name or create a default customer profile
    customer = await prisma.customer.findFirst({
      where: { companyName: { contains: user!.name, mode: "insensitive" } },
    });
  }

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        companyName: user!.name || "Direct Customer",
        contactName: user!.name || "Primary Contact",
        email: user!.email,
        tier: "BRONZE",
      },
    });
  }

  // 2. Find a sales representative to assign as owner
  const salesRep = await prisma.user.findFirst({
    where: { role: "SALES_REP" },
    orderBy: { createdAt: "asc" },
  });

  const ownerId = salesRep ? salesRep.id : user!.id;

  // 3. Generate quotation number
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomStr = Math.floor(1000 + Math.random() * 9000).toString();
  const quoteNumber = `Q-${dateStr}-${randomStr}`;

  // 4. Create quote in DRAFT status
  const quote = await prisma.quote.create({
    data: {
      quoteNumber,
      customerId: customer.id,
      ownerId,
      status: "DRAFT",
    },
  });

  // 5. Add lines
  for (const item of parsed.data.items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
    });
    if (!product) continue;

    await prisma.quoteLine.create({
      data: {
        quoteId: quote.id,
        productId: product.id,
        qty: item.qty,
        unitPrice: product.listPrice,
        discountPct: new Prisma.Decimal(0),
        lineTotal: new Prisma.Decimal(0),
        billingType: product.billingType,
        subscriptionMonths: item.subscriptionMonths,
      },
    });
  }

  // 6. Recompute quotation totals
  const updatedQuote = await recomputeQuotationTotals(quote.id);

  // 7. Add customer negotiation notes if provided
  if (parsed.data.notes && parsed.data.notes.trim()) {
    await prisma.negotiationComment.create({
      data: {
        quoteId: quote.id,
        content: parsed.data.notes.trim(),
      },
    });
  }

  // 8. Generate portal token for immediate access
  const rawToken = await generatePortalToken(quote.id, 30);

  // 9. Write audit log
  await writeAudit({
    entityType: "Quote",
    entityId: quote.id,
    action: "CUSTOMER_REQUESTED",
    actorId: user!.id,
    after: {
      quoteNumber: quote.quoteNumber,
      customerId: customer.id,
      itemsCount: parsed.data.items.length,
    },
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        quote: serializeForApi(updatedQuote),
        salesManager: serializeForApi(salesRep),
        portalToken: rawToken,
        portalUrl: `/portal/${rawToken}`,
      },
    },
    { status: 201 }
  );
}
