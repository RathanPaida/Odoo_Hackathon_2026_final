// src/app/api/auth/me/route.ts
// Returns or updates the current authenticated user's info.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { z } from "zod";

const UpdateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "New password must be at least 6 characters").optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Not logged in." } },
      { status: 401 }
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      approvalLimitPct: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    user: dbUser ?? {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Not logged in." } },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const data = UpdateProfileSchema.parse(body);

    const updateData: { name?: string; passwordHash?: string } = {};

    if (data.name) {
      updateData.name = data.name;
    }

    if (data.newPassword) {
      if (!data.currentPassword) {
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: "Current password is required to set a new password." } },
          { status: 400 }
        );
      }

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (!dbUser) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "User record not found." } },
          { status: 404 }
        );
      }

      const isValid = await verifyPassword(dbUser.passwordHash, data.currentPassword);
      if (!isValid) {
        return NextResponse.json(
          { error: { code: "UNAUTHORIZED", message: "Current password is incorrect." } },
          { status: 400 }
        );
      }

      updateData.passwordHash = await hashPassword(data.newPassword);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        approvalLimitPct: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: err.errors[0]?.message } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: err.message || "Failed to update profile." } },
      { status: 500 }
    );
  }
}
