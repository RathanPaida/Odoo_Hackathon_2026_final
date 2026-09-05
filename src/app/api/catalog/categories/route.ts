export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { catalogService } from "@/lib/services/catalog.service";
import { apiError, apiSuccess } from "@/lib/api-response";

// GET /api/catalog/categories - List all categories with product count & description
export async function GET() {
  try {
    const categories = await catalogService.listCategories();
    return apiSuccess(categories);
  } catch (error: any) {
    return apiError("FETCH_FAILED", error.message || "Failed to fetch categories.", 500);
  }
}

// POST /api/catalog/categories - Create or register a new category
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return apiError("FORBIDDEN", "Only administrators can create product categories.", 403);
    }

    const body = await req.json();
    const name = (body.name || "").trim();
    const description = (body.description || "").trim();

    if (!name) {
      return apiError("INVALID_INPUT", "Category name is required.", 400);
    }

    const category = await catalogService.createCategory({ name, description });
    return apiSuccess(category, 201);
  } catch (error: any) {
    return apiError("CREATE_FAILED", error.message || "Failed to create category.", 400);
  }
}
