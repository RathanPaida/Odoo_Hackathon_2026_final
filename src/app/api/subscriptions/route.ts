// src/app/api/subscriptions/route.ts
// GET /api/subscriptions
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { listSubscriptionLines } from "@/lib/services/subscription";
import { serializeForApi } from "@/lib/api-response";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { user, response } = await requireRole("ADMIN", "FINANCE");
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  try {
    const { lines, total } = await listSubscriptionLines({ limit, offset });
    return NextResponse.json({ success: true, data: serializeForApi({ subscriptions: lines, total }) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
