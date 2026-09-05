export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { convertQuoteToOrder } from "@/lib/services/order";
import { requireRole } from "@/lib/auth/rbac";
import { serializeForApi } from "@/lib/api-response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireRole("SALES_REP", "SALES_MANAGER", "ADMIN", "CUSTOMER");
  if (response) return response;

  const { id } = await params;

  try {
    const newOrder = await convertQuoteToOrder(id, user!.id);
    return NextResponse.json({ success: true, data: serializeForApi(newOrder) });
  } catch (error: any) {
    if (error.message.includes("Quote not found")) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: error.message } }, { status: 404 });
    }
    if (error.message.includes("APPROVED")) {
      return NextResponse.json({ success: false, error: { code: "INVALID_STATE", message: error.message } }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}
