// src/app/api/customers/[id]/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/rbac";
import { UpdateCustomerSchema } from "@/lib/contracts/customer";
import { writeAudit } from "@/lib/audit";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireRole("SALES_REP", "SALES_MANAGER", "ADMIN");
  if (response) return response;

  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      quotes: {
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: { id: true, quoteNumber: true, status: true, grandTotal: true, updatedAt: true },
      },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, orderNumber: true, status: true, totalAmount: true, createdAt: true },
      },
      _count: { select: { quotes: true, orders: true } },
    },
  });

  if (!customer) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Customer not found." } },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: customer });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireRole("SALES_REP", "SALES_MANAGER", "ADMIN");
  if (response) return response;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON body." } },
      { status: 400 }
    );
  }

  const parsed = UpdateCustomerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
      { status: 422 }
    );
  }

  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Customer not found." } },
      { status: 404 }
    );
  }

  // Check email uniqueness if changing
  if (parsed.data.email && parsed.data.email !== existing.email) {
    const dup = await prisma.customer.findUnique({ where: { email: parsed.data.email } });
    if (dup) {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE", message: "Email already in use." } },
        { status: 409 }
      );
    }
  }

  const updated = await prisma.customer.update({ where: { id }, data: parsed.data });

  await writeAudit({
    entityType: "Customer",
    entityId: id,
    action: "UPDATED",
    actorId: user!.id,
    before: existing,
    after: updated,
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireRole("ADMIN");
  if (response) return response;

  const { id } = await params;

  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Customer not found." } },
      { status: 404 }
    );
  }

  // Soft delete
  await prisma.customer.update({ where: { id }, data: { active: false } });

  await writeAudit({
    entityType: "Customer",
    entityId: id,
    action: "DEACTIVATED",
    actorId: user!.id,
  });

  return NextResponse.json({ success: true, data: { message: "Customer deactivated." } });
}
