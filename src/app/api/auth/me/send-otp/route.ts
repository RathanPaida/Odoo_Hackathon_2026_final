// src/app/api/auth/me/send-otp/route.ts
// Sends an OTP to the logged-in user's email for password change verification.
// Skips actual email delivery for dummy/local emails (returns simulated success and indicates skip).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

// Helper to determine if an email is a demo/dummy/local address
export function isDummyEmail(email: string): boolean {
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

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Not logged in." } },
      { status: 401 }
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true },
  });

  if (!dbUser) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "User record not found." } },
      { status: 404 }
    );
  }

  const email = dbUser.email;
  const dummy = isDummyEmail(email);

  if (dummy) {
    return NextResponse.json({
      success: true,
      skipOtp: true,
      message: "Dummy email detected. OTP verification bypassed for this account.",
    });
  }

  // Clean up any existing unexpired OTPs for this email
  await prisma.oTP.deleteMany({ where: { email } });

  // Generate 6-digit OTP code
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await prisma.oTP.create({
    data: {
      email,
      code: otp,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
    },
  });

  try {
    const { sendOTP } = await import("@/lib/email");
    await sendOTP(email, otp);
  } catch (err: any) {
    console.error("Failed to send OTP email:", err);
    return NextResponse.json(
      { error: { code: "EMAIL_FAILED", message: "Failed to dispatch verification email. Check SMTP settings." } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    skipOtp: false,
    message: `Verification code sent to ${email}.`,
  });
}
