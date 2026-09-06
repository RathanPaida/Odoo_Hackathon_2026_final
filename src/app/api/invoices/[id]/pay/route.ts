// src/app/api/invoices/[id]/pay/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { serializeForApi } from "@/lib/api-response";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireRole("ADMIN", "FINANCE", "CUSTOMER");
  if (response) return response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { customer: true },
    });

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
          { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
          { status: 403 }
        );
      }
    }

    if (invoice.status === "PAID") {
      return NextResponse.json(
        { success: false, error: { code: "ALREADY_PAID", message: "Invoice is already paid" } },
        { status: 400 }
      );
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        status: "PAID",
        paidAmount: invoice.amount,
      },
    });

    // Record payment log
    await prisma.payment.create({
      data: {
        invoiceId: id,
        customerId: invoice.customerId,
        amount: invoice.amount,
        paymentMethod: body.paymentMethod || (user!.role === "CUSTOMER" ? "ONLINE_PORTAL" : "MANUAL_RECONCILIATION"),
        status: "SUCCESS",
        transactionReference: body.transactionReference || `TXN-${Date.now()}`,
        paidAt: new Date(),
      },
    });

    await writeAudit({
      entityType: "Invoice",
      entityId: id,
      action: "PAID",
      actorId: user!.id,
      before: { status: invoice.status, paidAmount: invoice.paidAmount.toString() },
      after: { status: "PAID", paidAmount: invoice.amount.toString() },
    });

    return NextResponse.json({
      success: true,
      data: serializeForApi(updated),
      message: "Invoice payment recorded successfully",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}
