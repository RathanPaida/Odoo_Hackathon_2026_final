export const runtime = "nodejs";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  let body: { email?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: { code: "BAD_REQUEST", message: "Invalid JSON body." } }, { status: 400 });
  }

  const { email, code } = body;
  if (!email || !code) {
    return Response.json({ error: { code: "BAD_REQUEST", message: "Missing email or code." } }, { status: 400 });
  }

  const otpRecord = await prisma.oTP.findFirst({
    where: { email, code },
    orderBy: { createdAt: 'desc' }
  });

  if (!otpRecord) {
    return Response.json({ error: { code: "INVALID_OTP", message: "Invalid verification code." } }, { status: 400 });
  }

  if (new Date() > otpRecord.expiresAt) {
    return Response.json({ error: { code: "EXPIRED_OTP", message: "Verification code has expired." } }, { status: 400 });
  }

  // OTP is valid, mark user as verified
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return Response.json({ error: { code: "USER_NOT_FOUND", message: "User not found." } }, { status: 404 });
  }

  await prisma.user.update({
    where: { email },
    data: { emailVerified: true },
  });

  // Delete all OTPs for this email to prevent reuse
  await prisma.oTP.deleteMany({ where: { email } });

  // Issue session
  const res = Response.json({ ok: true, message: "Email verified successfully." });
  await createSession({ userId: user.id, role: user.role, ip: req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown" });

  return res;
}
