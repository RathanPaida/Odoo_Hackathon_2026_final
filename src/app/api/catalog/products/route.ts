export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { catalogService } from "@/lib/services/catalog.service";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const category = searchParams.get("category") || undefined;
    const activeParam = searchParams.get("active");
    const active = activeParam !== null ? activeParam === "true" : undefined;

    const products = await catalogService.listProducts({
      category: category ?? undefined,
    });
    return apiSuccess(products);
  } catch (error: any) {
    return apiError("FETCH_FAILED", error.message || "Failed to fetch products.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const category = body.category || body.categoryId;
    const price = body.listPrice !== undefined ? body.listPrice : body.basePrice;
    const cost = body.unitCost !== undefined ? body.unitCost : body.costPrice;

    if (!body.name || !category || price === undefined || cost === undefined) {
      return apiError(
        "INVALID_INPUT",
        "Name, category, basePrice (or listPrice), and costPrice (or unitCost) are required.",
        400
      );
    }

    const product = await catalogService.createProduct({
      ...body,
      category,
      listPrice: price,
      unitCost: cost,
    });
    return apiSuccess(product, 201);
  } catch (error: any) {
    return apiError("CREATE_FAILED", error.message || "Failed to create product.", 400);
  }
}
