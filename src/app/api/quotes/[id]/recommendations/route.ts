export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getRecommendationsForQuote } from "@/lib/services/recommendations";
import { requireRole } from "@/lib/auth/rbac";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireRole("SALES_REP", "SALES_MANAGER");
  if (response) return response;

  const { id } = await params;
  
  try {
    const recommendations = await getRecommendationsForQuote(id);
    return NextResponse.json({ success: true, data: recommendations });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}
