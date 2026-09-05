export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { catalogService } from "@/lib/services/catalog.service";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET() {
  try {
    const categories = await catalogService.listCategories();
    return apiSuccess(categories);
  } catch (error: any) {
    return apiError("FETCH_FAILED", error.message || "Failed to fetch categories.", 500);
  }
}

