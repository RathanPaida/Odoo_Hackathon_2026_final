// POST /api/auth/forgot-password
// Sends a 6-digit OTP to the user's email for password reset.
export const runtime = "nodejs";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body." } },
      { status: 400 }
    );
  }

  const { email } = body;
  if (!email) {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "Email is required." } },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Don't reveal whether the email exists — always return success
    return Response.json({ ok: true, message: "If that email exists, a code has been sent." });
  }

  // Clean up old OTPs for this email
  await prisma.oTP.deleteMany({ where: { email } });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await prisma.oTP.create({
    data: {
      email,
      code: otp,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    },
  });

  try {
    const { sendOTP } = await import("@/lib/email");
    await sendOTP(email, otp);
  } catch (err) {
    console.error("Failed to send password-reset OTP:", err);
  }

  return Response.json({ ok: true, message: "If that email exists, a code has been sent." });
}
