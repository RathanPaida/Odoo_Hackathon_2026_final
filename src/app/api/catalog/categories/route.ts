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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name) {
      return apiError("INVALID_INPUT", "Category name is required.", 400);
    }
    const category = await catalogService.createCategory({
      name: body.name,
      description: body.description,
    });
    return apiSuccess(category, 201);
  } catch (error: any) {
    return apiError("CREATE_FAILED", error.message || "Failed to create category.", 400);
  }
}
