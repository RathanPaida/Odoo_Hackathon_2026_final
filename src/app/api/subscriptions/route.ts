// src/app/api/subscriptions/route.ts
// GET /api/subscriptions, POST /api/subscriptions
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/rbac";
import { listSubscriptions, createSubscription } from "@/lib/services/subscription";

const CreateSubscriptionSchema = z.object({
  customerId: z.string().min(1),
  orderId: z.string().min(1),
  orderLineId: z.string().min(1),
  productId: z.string().min(1),
  planId: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  startDate: z.string().datetime(),
  autoPayEnabled: z.boolean().default(false),
});

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { user, response } = await requireRole("ADMIN", "FINANCE");
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const customerId = searchParams.get("customerId") ?? undefined;
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  try {
    const { subscriptions, total } = await listSubscriptions({
      status,
      customerId,
      limit,
      offset,
    });

    return NextResponse.json({ success: true, data: { subscriptions, total } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireRole("ADMIN", "FINANCE");
  if (response) return response;

  try {
    const body = await request.json();
    const data = CreateSubscriptionSchema.parse(body);

    const subscription = await createSubscription({
      customerId: data.customerId,
      orderId: data.orderId,
      orderLineId: data.orderLineId,
      productId: data.productId,
      planId: data.planId,
      quantity: data.quantity,
      startDate: new Date(data.startDate),
      autoPayEnabled: data.autoPayEnabled,
    });

    return NextResponse.json({ success: true, data: subscription }, { status: 201 });
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
