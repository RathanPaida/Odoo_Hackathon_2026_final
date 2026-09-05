// src/app/api/admin/users/[id]/role/route.ts
// Change a user's role — ADMIN only
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/rbac";
import { writeAudit } from "@/lib/audit";

const UpdateRoleSchema = z.object({
  role: z.enum(["SALES_REP", "SALES_MANAGER", "FINANCE", "ADMIN", "CUSTOMER"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user: admin, response } = await requireRole("ADMIN");
  if (response) return response;

  const { id: targetUserId } = await params;

  // Don't let admin change their own role (safety)
  if (targetUserId === admin!.id) {
    return NextResponse.json(
      { error: { code: "SELF_MODIFY", message: "You cannot change your own role." } },
      { status: 400 }
    );
  }

  // Validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Request body must be valid JSON." } },
      { status: 400 }
    );
  }

  const parsed = UpdateRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
      { status: 422 }
    );
  }

  const { role: newRole } = parsed.data;

  // Fetch the target user
  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "User not found." } },
      { status: 404 }
    );
  }

  if (targetUser.role === newRole) {
    return NextResponse.json(
      { error: { code: "NO_CHANGE", message: `User already has role ${newRole}.` } },
      { status: 400 }
    );
  }

  const previousRole = targetUser.role;

  // Update role + revoke all refresh tokens so next login gets fresh JWT claims
  await prisma.$transaction([
    prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: targetUserId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  // Audit trail
  await writeAudit({
    entityType: "User",
    entityId: targetUserId,
    action: "ROLE_CHANGED",
    actorId: admin!.id,
    before: { role: previousRole },
    after: { role: newRole },
  });

  return NextResponse.json({
    success: true,
    user: {
      id: targetUserId,
      email: targetUser.email,
      name: targetUser.name,
      previousRole,
      newRole,
    },
  });
}
