export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { governanceService } from "@/lib/services/governance.service";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET() {
  try {
    const rules = await governanceService.listCategoryDiscountRules();
    return apiSuccess(rules);
  } catch (error: any) {
    return apiError("FETCH_FAILED", error.message || "Failed to fetch category discount rules.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.categoryId || body.maximumDiscount === undefined) {
      return apiError("INVALID_INPUT", "categoryId and maximumDiscount are required.", 400);
    }
    const updated = await governanceService.upsertCategoryDiscountRule({
      categoryId: body.categoryId,
      maximumDiscount: body.maximumDiscount,
      active: body.active,
    });
    return apiSuccess(updated);
  } catch (error: any) {
    return apiError("UPDATE_FAILED", error.message || "Failed to update category discount rule.", 400);
  }
}
