// src/app/api/auth/signup/route.ts
export const runtime = "nodejs";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { SignupSchema } from "@/lib/contracts/auth";
import { Role } from "@prisma/client";

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
    },
    select: { id: true, email: true, name: true, role: true },
  });

  return Response.json(
    { ok: true, message: "Account created.", data: user },
    { status: 201 }
  );
}
