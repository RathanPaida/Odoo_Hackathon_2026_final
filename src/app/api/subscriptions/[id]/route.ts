export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { serializeForApi } from "@/lib/api-response";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireRole("ADMIN", "FINANCE", "CUSTOMER");
  if (response) return response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const sub = await prisma.subscription.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!sub) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Subscription not found" } },
        { status: 404 }
      );
    }

    if (user!.role === "CUSTOMER") {
      const customer = await prisma.customer.findFirst({
        where: { email: user!.email },
      });
      if (!customer || customer.id !== sub.customerId) {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "Access denied to this subscription" } },
          { status: 403 }
        );
      }
    }

    const dataToUpdate: any = {};

    // Toggle AutoPay
    if (typeof body.autoPayEnabled === "boolean") {
      dataToUpdate.autoPayEnabled = body.autoPayEnabled;
    }

    // Cancel Subscription
    if (body.action === "CANCEL") {
      dataToUpdate.status = "CANCELLED";
    }

    // Reactivate Subscription
    if (body.action === "REACTIVATE") {
      dataToUpdate.status = "ACTIVE";
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: dataToUpdate,
      include: {
        plan: true,
        lines: {
          include: {
            quoteLine: { include: { product: true } },
          },
        },
      },
    });

    await writeAudit({
      entityType: "Subscription",
      entityId: id,
      action: body.action || (typeof body.autoPayEnabled === "boolean" ? "AUTOPAY_TOGGLED" : "UPDATED"),
      actorId: user!.id,
      before: { status: sub.status, autoPayEnabled: sub.autoPayEnabled },
      after: { status: updated.status, autoPayEnabled: updated.autoPayEnabled },
    });

    return NextResponse.json({
      success: true,
      data: serializeForApi(updated),
      message: body.action === "CANCEL"
        ? "Subscription cancelled successfully."
        : body.action === "REACTIVATE"
        ? "Subscription reactivated successfully."
        : `Auto-pay has been ${updated.autoPayEnabled ? "enabled" : "disabled"}.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}
