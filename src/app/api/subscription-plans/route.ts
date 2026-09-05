// src/app/api/subscription-plans/route.ts
// GET /api/subscription-plans, POST /api/subscription-plans
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { dec } from "@/lib/services/billing";

const SubscriptionPlanSchema = z.object({
  name: z.string().min(1),
  billingCycle: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Must be a decimal string"),
  prorationEnabled: z.boolean().default(true),
  cancellationPolicy: z.string().optional(),
  refundPolicy: z.string().optional(),
  active: z.boolean().default(true),
});

export const runtime = "nodejs";

export async function GET() {
  const { user, response } = await requireRole("ADMIN", "FINANCE");
  if (response) return response;

  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: plans });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireRole("ADMIN");
  if (response) return response;

  try {
    const body = await request.json();
    const data = SubscriptionPlanSchema.parse(body);

    const plan = await prisma.subscriptionPlan.create({
      data: {
        name: data.name,
        billingCycle: data.billingCycle,
        price: dec(data.price),
        prorationEnabled: data.prorationEnabled,
        cancellationPolicy: data.cancellationPolicy,
        refundPolicy: data.refundPolicy,
        active: data.active,
      },
    });

    await writeAudit({
      entityType: "SubscriptionPlan",
      entityId: plan.id,
      action: "CREATED",
      before: undefined,
      after: { name: plan.name, billingCycle: plan.billingCycle, price: data.price },
    });

    return NextResponse.json({ success: true, data: plan }, { status: 201 });
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
