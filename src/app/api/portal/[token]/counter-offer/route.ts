export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { validatePortalToken } from "@/lib/services/portal";
import { prisma } from "@/lib/db";
import { transitionQuotation } from "@/lib/services/quotation";
import { serializeForApi } from "@/lib/api-response";

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
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON" } }, { status: 400 });
  }

  if (!body.content) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Content is required" } }, { status: 422 });
  }

  // Add the comment
  const comment = await prisma.negotiationComment.create({
    data: {
      quoteId: quoteRef.id,
      customerId: quoteRef.customerId,
      content: body.content,
      commentType: "COUNTER_DISCOUNT",
    },
  });

  // Transition to NEGOTIATING
  await transitionQuotation(quoteRef.id, "NEGOTIATE", quoteRef.customerId);

  return NextResponse.json({ success: true, data: serializeForApi(comment) });
}
