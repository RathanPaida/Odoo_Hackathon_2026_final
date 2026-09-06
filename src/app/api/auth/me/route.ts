// src/app/api/auth/me/route.ts
// Returns or updates the current authenticated user's info.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { serializeForApi } from "@/lib/api-response";
import { z } from "zod";

const UpdateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "New password must be at least 6 characters").optional(),
  otp: z.string().optional(),
});

function isDummyEmail(email: string): boolean {
  const normalized = email.toLowerCase().trim();
  return (
    normalized.endsWith(".local") ||
    normalized.endsWith("@dealflow.local") ||
    normalized.endsWith("@dealflow.com") ||
    normalized.endsWith("@example.com") ||
    normalized.endsWith("@test.com") ||
    normalized.endsWith("@dummy.com") ||
    normalized.endsWith(".corp") ||
    normalized.endsWith(".sol") ||
    normalized.endsWith(".ent") ||
    normalized.endsWith(".ltd") ||
    normalized.endsWith(".inc")
  );
}

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
    success: true,
    data: serializeForApi(
      dbUser ?? {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    ),
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

      // Check if OTP verification is required (skip for dummy emails)
      const email = dbUser.email;
      const isDummy = isDummyEmail(email);

      if (!isDummy) {
        if (!data.otp || !data.otp.trim()) {
          return NextResponse.json(
            { error: { code: "OTP_REQUIRED", message: "A verification code (OTP) is required to change your password." } },
            { status: 400 }
          );
        }

        const otpRecord = await prisma.oTP.findFirst({
          where: { email, code: data.otp.trim() },
        });

        if (!otpRecord) {
          return NextResponse.json(
            { error: { code: "INVALID_OTP", message: "Invalid verification code (OTP)." } },
            { status: 400 }
          );
        }

        if (new Date() > otpRecord.expiresAt) {
          return NextResponse.json(
            { error: { code: "EXPIRED_OTP", message: "Verification code has expired. Please request a new one." } },
            { status: 400 }
          );
        }

        // Clean up OTPs for this email after successful verification
        await prisma.oTP.deleteMany({ where: { email } });
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

    return NextResponse.json({
      success: true,
      data: serializeForApi(updated),
    });
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
