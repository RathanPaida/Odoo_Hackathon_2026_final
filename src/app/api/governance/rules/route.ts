export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  return NextResponse.json({ error: "Not Implemented - Use seed data" }, { status: 501 });
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ error: "Not Implemented - Use seed data" }, { status: 501 });
}
