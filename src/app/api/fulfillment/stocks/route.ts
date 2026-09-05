export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { fulfillmentService } from "@/lib/services/fulfillment.service";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const warehouseId = searchParams.get("warehouseId") || undefined;
    const productId = searchParams.get("productId") || undefined;

    const stocks = await fulfillmentService.listStocks({ warehouseId, productId });
    return apiSuccess(stocks);
  } catch (error: any) {
    return apiError("FETCH_FAILED", error.message || "Failed to fetch stock levels.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.warehouseId || !body.productId || body.availableQuantity === undefined) {
      return apiError(
        "INVALID_INPUT",
        "warehouseId, productId, and availableQuantity are required.",
        400
      );
    }

    const updated = await fulfillmentService.adjustStock({
      warehouseId: body.warehouseId,
      productId: body.productId,
      availableQuantity: Number(body.availableQuantity),
      reorderLevel: body.reorderLevel !== undefined ? Number(body.reorderLevel) : undefined,
    });

    return apiSuccess(updated);
  } catch (error: any) {
    return apiError("UPDATE_FAILED", error.message || "Failed to adjust stock.", 400);
  }
}
