// src/app/api/customers/route.ts
// Customer list + create — SALES_REP, SALES_MANAGER, ADMIN
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/rbac";
import { CreateCustomerSchema, CustomerQuerySchema } from "@/lib/contracts/customer";
import { writeAudit } from "@/lib/audit";
import { Prisma } from "@/generated/prisma";

export async function GET(req: NextRequest) {
  const { user, response } = await requireRole("SALES_REP", "SALES_MANAGER", "ADMIN");
  if (response) return response;

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = CustomerQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
      { status: 422 }
    );
  }

  const { search, tier, active, page, limit } = parsed.data;
  const where: Prisma.CustomerWhereInput = {};

  if (search) {
    where.OR = [
      { companyName: { contains: search, mode: "insensitive" } },
      { contactName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (tier) where.tier = tier;
  if (active !== undefined) where.active = active === "true";

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { quotes: true, orders: true } } },
    }),
    prisma.customer.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      customers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireRole("SALES_REP", "SALES_MANAGER", "ADMIN");
  if (response) return response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON body." } },
      { status: 400 }
    );
  }

  const parsed = CreateCustomerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
      { status: 422 }
    );
  }

  // Check duplicate email
  const existing = await prisma.customer.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json(
      { success: false, error: { code: "DUPLICATE", message: "A customer with this email already exists." } },
      { status: 409 }
    );
  }

  const customer = await prisma.customer.create({ data: parsed.data });

  await writeAudit({
    entityType: "Customer",
    entityId: customer.id,
    action: "CREATED",
    actorId: user!.id,
    after: customer,
  });

  return NextResponse.json({ success: true, data: customer }, { status: 201 });
}
