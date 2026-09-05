export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { governanceService } from "@/lib/services/governance.service";
import { apiError, apiSuccess } from "@/lib/api-response";
import { CustomerTier } from "@/generated/prisma";

export async function GET() {
  try {
    const tiers = await governanceService.listDiscountTiers();
    return apiSuccess(tiers);
  } catch (error: any) {
    return apiError("FETCH_FAILED", error.message || "Failed to fetch discount tiers.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.customerTier || body.maximumDiscount === undefined) {
      return apiError("INVALID_INPUT", "customerTier and maximumDiscount are required.", 400);
    }
    const updated = await governanceService.upsertDiscountTier({
      customerTier: body.customerTier as CustomerTier,
      maximumDiscount: body.maximumDiscount,
      active: body.active,
    });
    return apiSuccess(updated);
  } catch (error: any) {
    return apiError("UPDATE_FAILED", error.message || "Failed to update discount tier.", 400);
  }
}
