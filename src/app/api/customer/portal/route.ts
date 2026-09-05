export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/rbac";
import { randomBytes, createHash } from "crypto";
import { writeAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON" } },
      { status: 400 }
    );
  }

  const { quoteId } = body as { quoteId?: string };
  if (!quoteId) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_INPUT", message: "quoteId is required" } },
      { status: 400 }
    );
  }

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
  });

  if (!quote) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Quote not found" } },
      { status: 404 }
    );
  }

  if (user!.role === "CUSTOMER") {
    const customer = await prisma.customer.findFirst({
      where: { email: user!.email },
    });

    if (!customer || quote.customerId !== customer.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "You do not have access to this quote" } },
        { status: 403 }
      );
    }
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const portalToken = await prisma.portalToken.create({
    data: {
      quoteId,
      tokenHash,
      expiresAt,
    },
  });

  await writeAudit({
    entityType: "Quote",
    entityId: quoteId,
    action: "PORTAL_TOKEN_GENERATED",
    actorId: user!.id,
    after: { portalTokenId: portalToken.id },
  });

  return NextResponse.json({
    success: true,
    data: {
      portalToken: rawToken,
      portalUrl: `/portal/${rawToken}`,
    },
  });
}
