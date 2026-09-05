export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { generatePortalToken } from "@/lib/services/portal";
import { requireRole } from "@/lib/auth/rbac";
import { writeAudit } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireRole("SALES_REP", "SALES_MANAGER");
  if (response) return response;

  const { id } = await params;

  try {
    const rawToken = await generatePortalToken(id);
    
    // In a real environment, we'd use req.nextUrl.origin, but here's a safe default
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const link = `${origin}/portal/${rawToken}`;

    await writeAudit({
      entityType: "Quote",
      entityId: id,
      action: "PORTAL_LINK_GENERATED",
      actorId: user!.id,
    });

    return NextResponse.json({ success: true, data: { link, rawToken } });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}
