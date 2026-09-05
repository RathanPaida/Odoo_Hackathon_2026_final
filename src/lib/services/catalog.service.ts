// src/lib/services/catalog.service.ts
// Product catalog service — uses the generated Prisma client types.
// Product has: sku, name, category (string), listPrice, unitCost, billingType, minimumMargin, taxRate
// Product relations (lowercase): priceListItems, quoteLines, stockItems, orderLines, upsellTriggered, upsellRecommend
// No separate Category model — category is a plain string.
import { prisma } from "@/lib/db";
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
  // ─── Categories (derived from Product.category string field) ──────────────
  async listCategories() {
    const products = await prisma.product.findMany({
      select: { category: true },
    });
    const categorySet = new Set(products.map((p) => p.category));
    return Array.from(categorySet).sort().map((name) => ({
      name,
      productCount: products.filter((p) => p.category === name).length,
    }));
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

  async createProduct(input: CreateProductInput) {
    return prisma.product.create({
      data: {
        sku: input.sku,
        name: input.name,
        category: input.category,
        billingType: input.billingType ?? BillingType.ONE_TIME,
        listPrice: toDecimal(input.listPrice),
        unitCost: toDecimal(input.unitCost),
        taxRate: input.taxRate !== undefined ? toDecimal(input.taxRate) : new Prisma.Decimal(18),
        minimumMargin: input.minimumMargin !== undefined ? toDecimal(input.minimumMargin) : new Prisma.Decimal(10),
      },
    });
  },

  async updateProduct(id: string, input: UpdateProductInput) {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.category !== undefined) data.category = input.category;
    if (input.billingType !== undefined) data.billingType = input.billingType;
    if (input.listPrice !== undefined) data.listPrice = toDecimal(input.listPrice);
    if (input.unitCost !== undefined) data.unitCost = toDecimal(input.unitCost);
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
