export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { validatePortalToken } from "@/lib/services/portal";
import { convertQuoteToOrder } from "@/lib/services/order";

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

  if (quoteRef.status !== "APPROVED") {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_STATE", message: "Quote must be APPROVED to confirm." } },
      { status: 400 }
    );
  }

  try {
    // Pass customerId as the actor
    const newOrder = await convertQuoteToOrder(quoteRef.id, quoteRef.customerId);
    return NextResponse.json({ success: true, data: newOrder });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}
