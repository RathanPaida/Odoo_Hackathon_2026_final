// src/app/api/quotes/[id]/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/rbac";
import { serializeForApi } from "@/lib/api-response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireRole("SALES_REP", "SALES_MANAGER", "FINANCE", "ADMIN", "CUSTOMER");
  if (response) return response;

  const { id } = await params;

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      customer: true,
      owner: { select: { id: true, name: true, email: true } },
      lines: {
        include: {
          product: true,
        },
      },
      approvals: {
        orderBy: { cycle: "desc" },
      },
    },
  });

  if (!quote) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Quote not found" } },
      { status: 404 }
    );
  }

  // Security check: customers can only view quotes belonging to their customer profile
  if (user!.role === "CUSTOMER") {
    // Check if user email matches the customer's email or customer contact
    const customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { email: user!.email },
          { id: quote.customerId }
        ]
      }
    });

    if (!customer || quote.customerId !== customer.id || customer.email !== user!.email) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied: you do not have permission to view this customer's quotation." } },
        { status: 403 }
      );
    }
  }

  // Security check: reps can only view their own quotes
  if (user!.role === "SALES_REP" && quote.ownerId !== user!.id) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "You do not own this quote." } },
      { status: 403 }
    );
  }

  return NextResponse.json({ success: true, data: serializeForApi(quote) });
}
