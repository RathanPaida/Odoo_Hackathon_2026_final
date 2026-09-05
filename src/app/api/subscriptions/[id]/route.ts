// src/app/api/subscriptions/[id]/route.ts
// GET /api/subscriptions/:id
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { getSubscriptionLineById } from "@/lib/services/subscription";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireRole("ADMIN", "FINANCE");
  if (response) return response;

  const { id } = await params;

  try {
    const subscription = await getSubscriptionLineById(id);
    if (!subscription) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Subscription not found" } },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: subscription });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
