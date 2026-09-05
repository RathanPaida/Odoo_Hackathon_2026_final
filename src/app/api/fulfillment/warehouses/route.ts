export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { fulfillmentService } from "@/lib/services/fulfillment.service";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET() {
  try {
    const warehouses = await fulfillmentService.listWarehouses();
    return apiSuccess(warehouses);
  } catch (error: any) {
    return apiError("FETCH_FAILED", error.message || "Failed to fetch warehouses.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (
      !body.name ||
      body.latitude === undefined ||
      body.longitude === undefined ||
      body.shippingBaseCost === undefined
    ) {
      return apiError(
        "INVALID_INPUT",
        "name, latitude, longitude, and shippingBaseCost are required.",
        400
      );
    }

    const warehouse = await fulfillmentService.createWarehouse(body);
    return apiSuccess(warehouse, 201);
  } catch (error: any) {
    return apiError("CREATE_FAILED", error.message || "Failed to create warehouse.", 400);
  }
}
