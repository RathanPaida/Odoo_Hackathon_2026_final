export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { validatePortalToken } from "@/lib/services/portal";
import { prisma } from "@/lib/db";
import { serializeForApi } from "@/lib/api-response";

/**
 * GET /api/portal/:token/comments — List all negotiation comments for this quote
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const quoteRef = await validatePortalToken(token);
  if (!quoteRef) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Invalid or expired link." } },
      { status: 401 }
    );
  }

  const comments = await prisma.negotiationComment.findMany({
    where: { quoteId: quoteRef.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ success: true, data: serializeForApi(comments) });
}

/**
 * POST /api/portal/:token/comments — Add a line-level or quote-level comment
 * Body: { content: string, lineId?: string, commentType?: "COMMENT" | "COUNTER_DISCOUNT" | "QTY_CHANGE" | "PRODUCT_CHANGE", metadata?: object }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const quoteRef = await validatePortalToken(token);
  if (!quoteRef) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Invalid or expired link." } },
      { status: 401 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON" } },
      { status: 400 }
    );
  }

  if (!body.content || typeof body.content !== "string" || !body.content.trim()) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Content is required" } },
      { status: 422 }
    );
  }

  // If lineId is provided, verify it belongs to this quote
  if (body.lineId) {
    const line = await prisma.quoteLine.findFirst({
      where: { id: body.lineId, quoteId: quoteRef.id },
    });
    if (!line) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Line does not belong to this quote" } },
        { status: 422 }
      );
    }
  }

  const validTypes = ["COMMENT", "COUNTER_DISCOUNT", "QTY_CHANGE", "PRODUCT_CHANGE"];
  const commentType = validTypes.includes(body.commentType) ? body.commentType : "COMMENT";

  const comment = await prisma.negotiationComment.create({
    data: {
      quoteId: quoteRef.id,
      customerId: quoteRef.customerId,
      lineId: body.lineId || null,
      content: body.content.trim(),
      commentType,
      metadata: body.metadata || null,
    },
  });

  return NextResponse.json({ success: true, data: serializeForApi(comment) }, { status: 201 });
}
