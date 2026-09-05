export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { catalogService } from "@/lib/services/catalog.service";
import { apiError, apiSuccess, decimalToNumber, toDecimal } from "@/lib/api-response";

// Default category ceilings if no rule found
const DEFAULT_CATEGORY_LIMITS: Record<string, number> = {
  Hardware: 15.0,
  Services: 10.0,
  Software: 20.0,
  Support: 15.0,
  Networking: 15.0,
};

// GET /api/governance/categories - Returns category discount ceilings
export async function GET() {
  try {
    const categories = await catalogService.listCategories();
    const rules = await prisma.discountRule.findMany();

    const data = categories.map((cat) => {
      // Find representative rule for category (e.g. from GOLD or max across tiers)
      const catRules = rules.filter((r) => r.productCategory.toLowerCase() === cat.name.toLowerCase());
      
      let maximumDiscount = DEFAULT_CATEGORY_LIMITS[cat.name] ?? 15.0;
      if (catRules.length > 0) {
        const goldRule = catRules.find((r) => r.customerTier === "GOLD") || catRules[0];
        maximumDiscount = decimalToNumber(goldRule.maxAutoApprovePct);
      }

      return {
        id: `cat-rule-${cat.id}`,
        categoryId: cat.id,
        categoryName: cat.name,
        maximumDiscount,
        category: {
          id: cat.id,
          name: cat.name,
          description: cat.description,
        },
      };
    });

    return apiSuccess(data);
  } catch (error: any) {
    return apiError("FETCH_FAILED", error.message || "Failed to fetch category discount rules.", 500);
  }
}

// POST /api/governance/categories - Updates max discount ceiling for a category
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const categoryId = body.categoryId;
    const maximumDiscount = parseFloat(body.maximumDiscount);

    if (!categoryId || isNaN(maximumDiscount)) {
      return apiError("INVALID_INPUT", "categoryId and valid maximumDiscount are required.", 400);
    }

    const categories = await catalogService.listCategories();
    const targetCat = categories.find((c) => c.id === categoryId || c.name.toLowerCase() === categoryId.toLowerCase());
    const categoryName = targetCat ? targetCat.name : categoryId;

    // Update across all customer tiers for this category
    const tiers: Array<"BRONZE" | "SILVER" | "GOLD" | "PLATINUM"> = ["BRONZE", "SILVER", "GOLD", "PLATINUM"];
    for (const tier of tiers) {
      await prisma.discountRule.upsert({
        where: {
          customerTier_productCategory: {
            customerTier: tier,
            productCategory: categoryName,
          },
        },
        update: {
          maxAutoApprovePct: toDecimal(maximumDiscount),
        },
        create: {
          customerTier: tier,
          productCategory: categoryName,
          maxAutoApprovePct: toDecimal(maximumDiscount),
          requiredRole: "SALES_MANAGER",
        },
      });
    }

    return apiSuccess({
      categoryId,
      categoryName,
      maximumDiscount,
    });
  } catch (error: any) {
    console.error("Failed to update category discount rule:", error);
    return apiError("UPDATE_FAILED", error.message || "Failed to update category discount rule.", 400);
  }
}
