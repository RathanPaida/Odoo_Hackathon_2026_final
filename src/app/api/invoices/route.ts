// src/app/api/invoices/route.ts
// Spec §5 — GET /api/invoices, POST /api/invoices
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/rbac";
import { listInvoices, createOneTimeInvoice } from "@/lib/services/billing";
import { InvoiceStatus } from "@/lib/contracts/billing";
import { serializeForApi } from "@/lib/api-response";

const CreateInvoiceSchema = z.object({
  quoteId: z.string().min(1),
  dueDays: z.number().int().positive().default(30),
});

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { user, response } = await requireRole("ADMIN", "FINANCE");
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as InvoiceStatus | null;
  const customerId = searchParams.get("customerId") ?? undefined;
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  try {
    const { invoices, total } = await listInvoices({
      status: status ?? undefined,
      limit,
      offset,
    });

    return NextResponse.json({ success: true, data: serializeForApi({ invoices, total }) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireRole("ADMIN", "FINANCE");
  if (response) return response;

  try {
    const body = await request.json();
    const { quoteId, dueDays } = CreateInvoiceSchema.parse(body);

    const invoice = await createOneTimeInvoice(quoteId, dueDays);

    return NextResponse.json({ success: true, data: serializeForApi(invoice) }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: err.errors } },
        { status: 400 }
      );
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
