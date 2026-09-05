// src/app/api/quotes/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/rbac";
import { CreateQuoteSchema } from "@/lib/contracts/quote";
import { writeAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const { user, response } = await requireRole("SALES_REP", "SALES_MANAGER", "ADMIN");
  if (response) return response;

  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const where: any = {};
  if (user!.role === "SALES_REP") {
    where.ownerId = user!.id;
  }
  if (status) {
    where.status = status;
  }

  const quotes = await prisma.quote.findMany({
    where,
    include: {
      customer: { select: { companyName: true, tier: true } },
      owner: { select: { name: true } },
      _count: { select: { lines: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ success: true, data: quotes });
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireRole("SALES_REP", "SALES_MANAGER");
  if (response) return response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON" } },
      { status: 400 }
    );
  }

  const parsed = CreateQuoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
      { status: 422 }
    );
  }

  // Generate simple quote number Q-YYYYMMDD-XXXX
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomStr = Math.floor(1000 + Math.random() * 9000).toString();
  const quoteNumber = `Q-${dateStr}-${randomStr}`;

  const quote = await prisma.quote.create({
    data: {
      quoteNumber,
      customerId: parsed.data.customerId,
      ownerId: user!.id,
      status: "DRAFT",
    },
  });

  await writeAudit({
    entityType: "Quote",
    entityId: quote.id,
    action: "CREATED",
    actorId: user!.id,
  });

  return NextResponse.json({ success: true, data: quote }, { status: 201 });
}
