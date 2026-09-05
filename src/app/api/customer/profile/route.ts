export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/rbac";
import { writeAudit } from "@/lib/audit";
import { serializeForApi } from "@/lib/api-response";
import { z } from "zod";

const UpdateProfileSchema = z.object({
  phone: z.string().min(5, "Phone number must be at least 5 digits").max(25),
});

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;

  if (user!.role !== "CUSTOMER") {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Only customers can access their profile." } },
      { status: 403 }
    );
  }

  let customer = await prisma.customer.findFirst({
    where: { email: user!.email },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        companyName: user!.name || "Direct Customer",
        contactName: user!.name || "Primary Contact",
        email: user!.email,
        tier: "GOLD",
      },
    });
  }

  return NextResponse.json({ success: true, data: { customer: serializeForApi(customer) } });
}

export async function PATCH(req: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;

  if (user!.role !== "CUSTOMER") {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Only customers can update customer profile details." } },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON format" } },
      { status: 400 }
    );
  }

  const parsed = UpdateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0]?.message || "Invalid input" } },
      { status: 422 }
    );
  }

  // Find or create customer for this user email
  let customer = await prisma.customer.findFirst({
    where: { email: user!.email },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        companyName: user!.name || "Direct Customer",
        contactName: user!.name || "Primary Contact",
        email: user!.email,
        phone: parsed.data.phone.trim(),
        tier: "GOLD",
      },
    });
  } else {
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: { phone: parsed.data.phone.trim() },
    });
  }

  await writeAudit({
    entityType: "Customer",
    entityId: customer.id,
    action: "PHONE_UPDATED",
    actorId: user!.id,
    after: { phone: customer.phone },
  });

  return NextResponse.json({ success: true, data: { phone: customer.phone } });
}
