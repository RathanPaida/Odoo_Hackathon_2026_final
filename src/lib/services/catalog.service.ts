// src/lib/services/catalog.service.ts
// Product catalog service — uses the generated Prisma client types.
// Product has: sku, name, category (string), listPrice, unitCost, billingType, minimumMargin, taxRate
// Product relations (lowercase): priceListItems, quoteLines, stockItems, orderLines, upsellTriggered, upsellRecommend
// No separate Category model — category is a plain string.
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { Prisma, BillingType } from "@/generated/prisma";
import { toDecimal } from "@/lib/api-response";

export interface CreateProductInput {
  sku: string;
  name: string;
  category: string;
  billingType?: BillingType;
  listPrice: number | string | Prisma.Decimal;
  unitCost: number | string | Prisma.Decimal;
  taxRate?: number | string | Prisma.Decimal;
  minimumMargin?: number | string | Prisma.Decimal;
}

export interface UpdateProductInput {
  name?: string;
  category?: string;
  billingType?: BillingType;
  listPrice?: number | string | Prisma.Decimal;
  unitCost?: number | string | Prisma.Decimal;
  taxRate?: number | string | Prisma.Decimal;
  minimumMargin?: number | string | Prisma.Decimal;
}

export const catalogService = {
  // ─── Categories (persisted and derived from Product.category + DiscountRules) ──────────────
  async listCategories(): Promise<Array<{ id: string; name: string; description: string; productCount: number }>> {
    // 1. Get products count grouped by category
    const products = await prisma.product.findMany({
      select: { category: true },
    });
    
    // 2. Get discount rules categories
    const discountRules = await prisma.discountRule.findMany({
      select: { productCategory: true },
    });

    const metaMap: Record<string, string> = {
      Hardware: "Computer hardware",
      Software: "Software products",
      Services: "Professional services",
    };

    // Try reading Redis metadata if available (with timeout protection)
    try {
      if (redis.status === "ready" || redis.status === "connecting") {
        const stored = await Promise.race([
          redis.get("catalog:categories:meta"),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 300)),
        ]);
        if (stored) {
          const parsed = JSON.parse(stored);
          Object.assign(metaMap, parsed);
        }
      }
    } catch {
      // Redis fallback
    }

    const allCategoryNames = new Set<string>([
      ...Object.keys(metaMap),
      ...products.map((p) => p.category),
      ...discountRules.map((d) => d.productCategory),
    ]);

    return Array.from(allCategoryNames)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({
        id: name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        name,
        description: metaMap[name] || `${name} category products and services`,
        productCount: products.filter((p) => p.category.toLowerCase() === name.toLowerCase()).length,
      }));
  },

  async createCategory(input: { name: string; description?: string }) {
    const trimmedName = input.name.trim();
    const description = (input.description || "").trim() || `${trimmedName} products and services`;

    // 1. Persist to Redis metadata with fast timeout
    try {
      let currentMap: Record<string, string> = {
        Hardware: "Computer hardware",
        Software: "Software products",
        Services: "Professional services",
      };
      if (redis.status === "ready") {
        const stored = await Promise.race([
          redis.get("catalog:categories:meta"),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 300)),
        ]);
        if (stored) {
          currentMap = { ...currentMap, ...JSON.parse(stored) };
        }
        currentMap[trimmedName] = description;
        await redis.set("catalog:categories:meta", JSON.stringify(currentMap));
      }
    } catch {
      // Redis fallback
    }

    // 2. Ensure default DiscountRule exists for this category across customer tiers in the DB
    // This permanently writes the category into the database so it is ALWAYS returned in listCategories()!
    try {
      const tiers: Array<"BRONZE" | "SILVER" | "GOLD" | "PLATINUM"> = [
        "BRONZE",
        "SILVER",
        "GOLD",
        "PLATINUM",
      ];
      for (const tier of tiers) {
        await prisma.discountRule.upsert({
          where: {
            customerTier_productCategory: {
              customerTier: tier,
              productCategory: trimmedName,
            },
          },
          update: {},
          create: {
            customerTier: tier,
            productCategory: trimmedName,
            maxAutoApprovePct: tier === "PLATINUM" ? 25 : tier === "GOLD" ? 20 : tier === "SILVER" ? 15 : 10,
            requiredRole: "SALES_MANAGER",
          },
        });
      }
    } catch (dbErr) {
      console.error("Failed to seed discount rules for category:", dbErr);
    }

    return {
      id: trimmedName.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      name: trimmedName,
      description,
      productCount: 0,
    };
  },

  // ─── Products ───────────────────────────────────────────────────────────────
  async listProducts(filters?: { category?: string }) {
    return prisma.product.findMany({
      where: {
        ...(filters?.category ? { category: filters.category } : {}),
      },
      include: {
        priceListItems: true,
        stockItems: {
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
  },

  async getProduct(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: {
        priceListItems: true,
        stockItems: {
          include: { warehouse: true },
        },
      },
    });
  },

  async createProduct(input: any) {
    const categoryName = input.category || input.categoryId || "Hardware";
    const sku = input.sku || `SKU-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
    const billingType = input.billingType || (input.productType === "SUBSCRIPTION" ? BillingType.RECURRING : BillingType.ONE_TIME);
    const listPrice = input.listPrice !== undefined ? input.listPrice : input.basePrice !== undefined ? input.basePrice : 0;
    const unitCost = input.unitCost !== undefined ? input.unitCost : input.costPrice !== undefined ? input.costPrice : 0;

    return prisma.product.create({
      data: {
        sku,
        name: input.name,
        category: categoryName,
        billingType,
        listPrice: toDecimal(listPrice),
        unitCost: toDecimal(unitCost),
        taxRate: input.taxRate !== undefined ? toDecimal(input.taxRate) : new Prisma.Decimal(18),
        minimumMargin: input.minimumMargin !== undefined ? toDecimal(input.minimumMargin) : new Prisma.Decimal(10),
      },
    });
  },

  async updateProduct(id: string, input: any) {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.category !== undefined) data.category = input.category;
    else if (input.categoryId !== undefined) data.category = input.categoryId;

    if (input.billingType !== undefined) data.billingType = input.billingType;
    else if (input.productType !== undefined) {
      data.billingType = input.productType === "SUBSCRIPTION" ? BillingType.RECURRING : BillingType.ONE_TIME;
    }

    if (input.listPrice !== undefined) data.listPrice = toDecimal(input.listPrice);
    else if (input.basePrice !== undefined) data.listPrice = toDecimal(input.basePrice);

    if (input.unitCost !== undefined) data.unitCost = toDecimal(input.unitCost);
    else if (input.costPrice !== undefined) data.unitCost = toDecimal(input.costPrice);

    if (input.taxRate !== undefined) data.taxRate = toDecimal(input.taxRate);
    if (input.minimumMargin !== undefined) data.minimumMargin = toDecimal(input.minimumMargin);

    return prisma.product.update({
      where: { id },
      data,
    });
  },

  async deleteProduct(id: string) {
    return prisma.product.delete({
      where: { id },
    });
  },

  async getProductBySku(sku: string) {
    return prisma.product.findUnique({
      where: { sku },
    });
  },
};
