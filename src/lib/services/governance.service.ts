import { prisma } from "@/lib/db";
import { CustomerTier, ApprovalLevel, Prisma } from "@/generated/prisma";
import { toDecimal } from "@/lib/api-response";

export interface UpsertDiscountTierInput {
  customerTier: CustomerTier;
  maximumDiscount: number | string | Prisma.Decimal;
  active?: boolean;
}

export interface UpsertCategoryDiscountRuleInput {
  categoryId: string;
  maximumDiscount: number | string | Prisma.Decimal;
  active?: boolean;
}

export interface CreateApprovalRuleInput {
  minimumRiskScore: number | string | Prisma.Decimal;
  maximumRiskScore: number | string | Prisma.Decimal;
  requiredApprovalLevel: ApprovalLevel;
  active?: boolean;
}

export const governanceService = {
  // ─── Customer Tier Ceilings ────────────────────────────────────────────────
  async listDiscountTiers() {
    return prisma.discountTier.findMany({
      orderBy: { customerTier: "asc" },
    });
  },

  async upsertDiscountTier(input: UpsertDiscountTierInput) {
    return prisma.discountTier.upsert({
      where: { customerTier: input.customerTier },
      create: {
        customerTier: input.customerTier,
        maximumDiscount: toDecimal(input.maximumDiscount),
        active: input.active ?? true,
      },
      update: {
        maximumDiscount: toDecimal(input.maximumDiscount),
        active: input.active ?? true,
      },
    });
  },

  // ─── Category Discount Ceilings ───────────────────────────────────────────
  async listCategoryDiscountRules() {
    return prisma.categoryDiscountRule.findMany({
      include: {
        category: true,
      },
      orderBy: { category: { name: "asc" } },
    });
  },

  async upsertCategoryDiscountRule(input: UpsertCategoryDiscountRuleInput) {
    return prisma.categoryDiscountRule.upsert({
      where: { categoryId: input.categoryId },
      create: {
        categoryId: input.categoryId,
        maximumDiscount: toDecimal(input.maximumDiscount),
        active: input.active ?? true,
      },
      update: {
        maximumDiscount: toDecimal(input.maximumDiscount),
        active: input.active ?? true,
      },
      include: {
        category: true,
      },
    });
  },

  // ─── Approval Rules ───────────────────────────────────────────────────────
  async listApprovalRules() {
    return prisma.approvalRule.findMany({
      orderBy: { minimumRiskScore: "asc" },
    });
  },

  async createApprovalRule(input: CreateApprovalRuleInput) {
    return prisma.approvalRule.create({
      data: {
        minimumRiskScore: toDecimal(input.minimumRiskScore),
        maximumRiskScore: toDecimal(input.maximumRiskScore),
        requiredApprovalLevel: input.requiredApprovalLevel,
        active: input.active ?? true,
      },
    });
  },

  async updateApprovalRule(id: string, input: Partial<CreateApprovalRuleInput>) {
    const data: Prisma.ApprovalRuleUpdateInput = {};
    if (input.minimumRiskScore !== undefined) data.minimumRiskScore = toDecimal(input.minimumRiskScore);
    if (input.maximumRiskScore !== undefined) data.maximumRiskScore = toDecimal(input.maximumRiskScore);
    if (input.requiredApprovalLevel !== undefined) data.requiredApprovalLevel = input.requiredApprovalLevel;
    if (input.active !== undefined) data.active = input.active;

    return prisma.approvalRule.update({
      where: { id },
      data,
    });
  },

  async deleteApprovalRule(id: string) {
    return prisma.approvalRule.delete({
      where: { id },
    });
  },
};
