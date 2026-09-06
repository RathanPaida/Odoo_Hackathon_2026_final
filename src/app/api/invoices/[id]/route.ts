// src/app/api/invoices/[id]/route.ts
// GET /api/invoices/:id, DELETE /api/invoices/:id (cancel)
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { getInvoiceById, cancelInvoice } from "@/lib/services/billing";
import { serializeForApi } from "@/lib/api-response";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireRole("ADMIN", "FINANCE", "CUSTOMER");
  if (response) return response;

  const { id } = await params;

  try {
    const invoice = await getInvoiceById(id);
    if (!invoice) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Invoice not found" } },
        { status: 404 }
      );
    }

    if (user!.role === "CUSTOMER") {
      const customer = await prisma.customer.findFirst({
        where: { email: user!.email },
      });
      if (!customer || customer.id !== invoice.customerId) {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "Access denied to invoice" } },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ success: true, data: serializeForApi(invoice) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireRole("ADMIN", "FINANCE");
  if (response) return response;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const reason = body.reason ?? undefined;

  try {
    const invoice = await cancelInvoice(id, reason);
    return NextResponse.json({ success: true, data: serializeForApi(invoice) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
