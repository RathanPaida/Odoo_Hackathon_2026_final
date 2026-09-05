export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { catalogService } from "@/lib/services/catalog.service";
import { apiError, apiSuccess } from "@/lib/api-response";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const product = await catalogService.getProduct(id);
    if (!product) {
      return apiError("NOT_FOUND", `Product '${id}' not found.`, 404);
    }
    return apiSuccess(product);
  } catch (error: any) {
    return apiError("FETCH_FAILED", error.message || "Failed to fetch product.", 500);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await catalogService.updateProduct(id, body);
    return apiSuccess(updated);
  } catch (error: any) {
    return apiError("UPDATE_FAILED", error.message || "Failed to update product.", 400);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await catalogService.deleteProduct(id);
    return apiSuccess({ deleted: true, id });
  } catch (error: any) {
    return apiError("DELETE_FAILED", error.message || "Failed to delete product.", 400);
  }
}
