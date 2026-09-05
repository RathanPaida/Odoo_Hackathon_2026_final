// src/lib/services/governance.service.ts
// Discount governance — manages DiscountRule table.
// Schema has: DiscountRule (customerTier, productCategory, maxAutoApprovePct, requiredRole)
// No separate DiscountTier, CategoryDiscountRule, or ApprovalRule models.
import { prisma } from "@/lib/db";
import { CustomerTier, Role, Prisma } from "@/generated/prisma";
import { toDecimal } from "@/lib/api-response";

export interface UpsertDiscountRuleInput {
  customerTier: CustomerTier;
  productCategory: string;
  maxAutoApprovePct: number | string | Prisma.Decimal;
  requiredRole: Role;
}

export const governanceService = {
  // ─── Discount Rules ────────────────────────────────────────────────────────
  async listDiscountRules() {
    return prisma.discountRule.findMany({
      orderBy: [{ customerTier: "asc" }, { productCategory: "asc" }],
    });
  },

  async upsertDiscountRule(input: UpsertDiscountRuleInput) {
    return prisma.discountRule.upsert({
      where: {
        customerTier_productCategory: {
          customerTier: input.customerTier,
          productCategory: input.productCategory,
        },
      },
      create: {
        customerTier: input.customerTier,
        productCategory: input.productCategory,
        maxAutoApprovePct: toDecimal(input.maxAutoApprovePct),
        requiredRole: input.requiredRole,
      },
      update: {
        maxAutoApprovePct: toDecimal(input.maxAutoApprovePct),
        requiredRole: input.requiredRole,
      },
    });
  },

  async deleteDiscountRule(id: string) {
    return prisma.discountRule.delete({
      where: { id },
    });
  },

  // ─── Discount Rules by Tier ───────────────────────────────────────────────
  async getDiscountRulesForTier(tier: CustomerTier) {
    return prisma.discountRule.findMany({
      where: { customerTier: tier },
    });
  },

  // ─── Discount Rules by Category ───────────────────────────────────────────
  async getDiscountRulesForCategory(productCategory: string) {
    return prisma.discountRule.findMany({
      where: { productCategory },
    });
  },
};
