export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { validatePortalToken } from "@/lib/services/portal";
import { prisma } from "@/lib/db";
import { serializeForApi } from "@/lib/api-response";

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

  // Fetch full details
  const quote = await prisma.quote.findUnique({
    where: { id: quoteRef.id },
    include: {
      customer: { select: { companyName: true, contactName: true, email: true } },
      owner: { select: { name: true, email: true } },
      lines: {
        include: {
          product: { select: { name: true, sku: true } },
        }
      }
    }
  });

  return NextResponse.json({ success: true, data: serializeForApi(quote) });
}
