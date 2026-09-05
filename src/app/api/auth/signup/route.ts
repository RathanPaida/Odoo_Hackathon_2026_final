// src/app/api/auth/signup/route.ts
export const runtime = "nodejs";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { SignupSchema } from "@/lib/contracts/auth";
import { Role } from "@/generated/prisma";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body." } },
      { status: 400 }
    );
  }

  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          fields: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 422 }
    );
  }

  const { email, password, name, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return Response.json(
      { error: { code: "CONFLICT", message: "Email already registered." } },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role: (role as Role) ?? Role.SALES_REP,
      approvalLimitPct: 0,
      emailVerified: false,
    },
    select: { id: true, email: true, name: true, role: true },
  });

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
  } catch (err) {
    console.error("Failed to send OTP email:", err);
    // Ignore error for now, maybe in production we'd want to fail the signup
  }

  return Response.json(
    { ok: true, message: "Account created. Verification required.", requiresVerification: true, data: user },
    { status: 201 }
  );
}
