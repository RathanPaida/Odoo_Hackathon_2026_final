// POST /api/auth/reset-password
// Verifies OTP and sets a new password.
export const runtime = "nodejs";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

export async function POST(req: NextRequest) {
  let body: { email?: string; code?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body." } },
      { status: 400 }
    );
  }

  const { email, code, password } = body;
  if (!email || !code || !password) {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "Email, code, and new password are required." } },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return Response.json(
      { error: { code: "VALIDATION_ERROR", message: "Password must be at least 8 characters." } },
      { status: 422 }
    );
  }

  // Find the OTP
  const otpRecord = await prisma.oTP.findFirst({
    where: { email, code },
    orderBy: { createdAt: "desc" },
  });

  if (!otpRecord) {
    return Response.json(
      { error: { code: "INVALID_OTP", message: "Invalid verification code." } },
      { status: 400 }
    );
  }

  if (new Date() > otpRecord.expiresAt) {
    return Response.json(
      { error: { code: "EXPIRED_OTP", message: "Verification code has expired. Please request a new one." } },
      { status: 400 }
    );
  }

  // OTP valid — update password and mark email as verified
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return Response.json(
      { error: { code: "USER_NOT_FOUND", message: "User not found." } },
      { status: 404 }
    );
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { email },
    data: { passwordHash, emailVerified: true },
  });

  // Clean up all OTPs for this email
  await prisma.oTP.deleteMany({ where: { email } });

  return Response.json({ ok: true, message: "Password has been reset. You can now sign in." });
}
