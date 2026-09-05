import { prisma } from "@/lib/db";
import { Prisma, ProductType } from "@/generated/prisma";
import { toDecimal } from "@/lib/api-response";

export interface CreateCategoryInput {
  name: string;
  description?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  categoryId: string;
  productType?: ProductType;
  basePrice: number | string | Prisma.Decimal;
  costPrice: number | string | Prisma.Decimal;
  taxRate?: number | string | Prisma.Decimal;
  minimumMargin?: number | string | Prisma.Decimal;
  active?: boolean;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  categoryId?: string;
  productType?: ProductType;
  basePrice?: number | string | Prisma.Decimal;
  costPrice?: number | string | Prisma.Decimal;
  taxRate?: number | string | Prisma.Decimal;
  minimumMargin?: number | string | Prisma.Decimal;
  active?: boolean;
}

export interface CreateVariantInput {
  productId: string;
  attributeName: string;
  attributeValue: string;
  extraPrice?: number | string | Prisma.Decimal;
}

export const catalogService = {
  // ─── Categories ─────────────────────────────────────────────────────────────
  async listCategories() {
    return prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { products: true } },
        categoryDiscountRules: true,
      },
    });
  },

  async getCategory(id: string) {
    return prisma.category.findUnique({
      where: { id },
      include: {
        products: true,
        categoryDiscountRules: true,
      },
    });
  },

  async createCategory(input: CreateCategoryInput) {
    return prisma.category.create({
      data: {
        name: input.name,
        description: input.description,
      },
    });
  },

  async updateCategory(id: string, input: UpdateCategoryInput) {
    return prisma.category.update({
      where: { id },
      data: input,
    });
  },

  async deleteCategory(id: string) {
    return prisma.category.delete({
      where: { id },
    });
  },

  // ─── Products ───────────────────────────────────────────────────────────────
  async listProducts(filters?: { categoryId?: string; active?: boolean }) {
    return prisma.product.findMany({
      where: {
        ...(filters?.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters?.active !== undefined ? { active: filters.active } : {}),
      },
      include: {
        category: true,
        variants: true,
        warehouseStocks: {
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getProduct(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        variants: true,
        warehouseStocks: {
          include: { warehouse: true },
        },
      },
    });
  },

  async createProduct(input: CreateProductInput) {
    return prisma.product.create({
      data: {
        name: input.name,
        description: input.description,
        categoryId: input.categoryId,
        productType: input.productType ?? ProductType.ONE_TIME,
        basePrice: toDecimal(input.basePrice),
        costPrice: toDecimal(input.costPrice),
        taxRate: input.taxRate !== undefined ? toDecimal(input.taxRate) : new Prisma.Decimal(0),
        minimumMargin: input.minimumMargin !== undefined ? toDecimal(input.minimumMargin) : new Prisma.Decimal(0),
        active: input.active ?? true,
      },
      include: {
        category: true,
        variants: true,
      },
    });
  },

  async updateProduct(id: string, input: UpdateProductInput) {
    const data: Prisma.ProductUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.categoryId !== undefined) data.category = { connect: { id: input.categoryId } };
    if (input.productType !== undefined) data.productType = input.productType;
    if (input.basePrice !== undefined) data.basePrice = toDecimal(input.basePrice);
    if (input.costPrice !== undefined) data.costPrice = toDecimal(input.costPrice);
    if (input.taxRate !== undefined) data.taxRate = toDecimal(input.taxRate);
    if (input.minimumMargin !== undefined) data.minimumMargin = toDecimal(input.minimumMargin);
    if (input.active !== undefined) data.active = input.active;

    return prisma.product.update({
      where: { id },
      data,
      include: {
        category: true,
        variants: true,
      },
    });
  },

  async deleteProduct(id: string) {
    return prisma.product.delete({
      where: { id },
    });
  },

  // ─── Variants ───────────────────────────────────────────────────────────────
  async createVariant(input: CreateVariantInput) {
    return prisma.productVariant.create({
      data: {
        productId: input.productId,
        attributeName: input.attributeName,
        attributeValue: input.attributeValue,
        extraPrice: input.extraPrice !== undefined ? toDecimal(input.extraPrice) : new Prisma.Decimal(0),
      },
    });
  },

  async deleteVariant(id: string) {
    return prisma.productVariant.delete({
      where: { id },
    });
  },
};
