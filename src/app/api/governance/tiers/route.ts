export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CustomerTier } from "@/generated/prisma";
import { apiError, apiSuccess, decimalToNumber, toDecimal } from "@/lib/api-response";

// Default fallback limits for customer tiers
const DEFAULT_TIER_LIMITS: Record<CustomerTier, number> = {
  PLATINUM: 25.0,
  GOLD: 15.0,
  SILVER: 10.0,
  BRONZE: 5.0,
};

// GET /api/governance/tiers - Returns max discount ceiling per customer tier
export async function GET() {
  try {
    const rules = await prisma.discountRule.findMany();

    const tiers: CustomerTier[] = ["GOLD", "SILVER", "BRONZE", "PLATINUM"];

    const data = tiers.map((tier) => {
      // Find rules matching this tier
      const tierRules = rules.filter((r) => r.customerTier === tier);
      let maximumDiscount = DEFAULT_TIER_LIMITS[tier] || 15.0;

      if (tierRules.length > 0) {
        // Average or representative rule for general tier ceiling
        // Specifically for GOLD, default is 15.0
        const hardwareOrFirst = tierRules.find((r) => r.productCategory === "Hardware") || tierRules[0];
        maximumDiscount = decimalToNumber(hardwareOrFirst.maxAutoApprovePct);
      }

      return {
        id: `tier-${tier.toLowerCase()}`,
        customerTier: tier,
        maximumDiscount,
      };
    });

    return apiSuccess(data);
  } catch (error: any) {
    return apiError("FETCH_FAILED", error.message || "Failed to fetch tier rules.", 500);
  }
}

// POST /api/governance/tiers - Updates max discount ceiling for a customer tier
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const customerTier = body.customerTier as CustomerTier;
    const maximumDiscount = parseFloat(body.maximumDiscount);

    if (!customerTier || isNaN(maximumDiscount)) {
      return apiError("INVALID_INPUT", "customerTier and valid maximumDiscount are required.", 400);
    }

    // Update all discount rules for this tier in the database
    await prisma.discountRule.updateMany({
      where: { customerTier },
      data: {
        maxAutoApprovePct: toDecimal(maximumDiscount),
      },
    });

    return apiSuccess({
      customerTier,
      maximumDiscount,
    });
  } catch (error: any) {
    return apiError("UPDATE_FAILED", error.message || "Failed to update tier discount limit.", 400);
  }
}
