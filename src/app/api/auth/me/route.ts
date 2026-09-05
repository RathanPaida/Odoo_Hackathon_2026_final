// src/app/api/auth/me/route.ts
// Returns the current authenticated user's info (no password).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Not logged in." } },
      { status: 401 }
    );
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
}
