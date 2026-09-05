// src/app/api/subscriptions/[id]/route.ts
// GET /api/subscriptions/:id, PATCH /api/subscriptions/:id, DELETE /api/subscriptions/:id
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/rbac";
import { getSubscriptionById, updateSubscription, cancelSubscription, changeSubscriptionPlan } from "@/lib/services/subscription";

const UpdateSubscriptionSchema = z.object({
  quantity: z.number().int().positive().optional(),
  planId: z.string().optional(),
  autoPayEnabled: z.boolean().optional(),
  status: z.enum(["ACTIVE", "PAUSED", "CANCELLED", "EXPIRED", "PAST_DUE"]).optional(),
});

const CancelSubscriptionSchema = z.object({
  immediate: z.boolean().default(false),
});

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireRole("ADMIN", "FINANCE");
  if (response) return response;

  const { id } = await params;

  try {
    const subscription = await getSubscriptionById(id);
    if (!subscription) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Subscription not found" } },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: subscription });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireRole("ADMIN", "FINANCE");
  if (response) return response;

  const { id } = await params;

  try {
    const body = await request.json();
    const data = UpdateSubscriptionSchema.parse(body);

    let result;
    if (body.newPlanId) {
      const proration = await changeSubscriptionPlan(id, body.newPlanId);
      result = proration;
    } else {
      result = await updateSubscription(id, data);
    }

    return NextResponse.json({ success: true, data: result });
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireRole("ADMIN", "FINANCE");
  if (response) return response;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const immediate = body.immediate ?? false;

  try {
    const subscription = await cancelSubscription(id, immediate);
    return NextResponse.json({ success: true, data: subscription });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
