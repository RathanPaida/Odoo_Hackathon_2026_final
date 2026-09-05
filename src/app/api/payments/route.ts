// src/app/api/payments/route.ts
// POST /api/payments (record a payment)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/rbac";
import { recordPayment } from "@/lib/services/billing";
import { Prisma } from "@/generated/prisma";

const RecordPaymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Must be a decimal string"),
  paymentMethod: z.string().min(1),
  transactionReference: z.string().optional(),
});

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { user, response } = await requireRole("ADMIN", "FINANCE");
  if (response) return response;

  try {
    const body = await request.json();
    const data = RecordPaymentSchema.parse(body);

    const result = await recordPayment(
      data.invoiceId,
      data.amount,
      data.paymentMethod,
      data.transactionReference
    );

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: err.errors } },
        { status: 400 }
      );
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
