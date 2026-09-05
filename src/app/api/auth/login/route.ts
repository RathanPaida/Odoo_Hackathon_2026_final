// src/app/api/auth/login/route.ts
export const runtime = "nodejs";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { LoginSchema } from "@/lib/contracts/auth";

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

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

  const parsed = LoginSchema.safeParse(body);
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

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return Response.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid email or password." } },
      { status: 401 }
    );
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    return Response.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid email or password." } },
      { status: 401 }
    );
  }

  await createSession({
    userId: user.id,
    role: user.role,
    userAgent: req.headers.get("user-agent") ?? undefined,
    ip: getIp(req),
  });

  await writeAudit({
    entityType: "User",
    entityId: user.id,
    action: "LOGIN",
    actorId: user.id,
  });

  return Response.json({
    ok: true,
    message: "Login successful.",
    data: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}
