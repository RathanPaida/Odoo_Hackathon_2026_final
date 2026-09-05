// src/lib/services/blended-risk.service.ts
// Blended risk evaluation using actual Prisma schema.
// Uses: Quote, QuoteLine, Product, DiscountRule, CustomerTier, ApprovalStatus, Role
import { prisma } from "@/lib/db";
import { ApprovalStatus, CustomerTier, Prisma, Role } from "@/generated/prisma";
import { decimalToNumber, toDecimal } from "@/lib/api-response";

export interface LineEvaluationBreakdown {
  lineId: string;
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  appliedDiscount: number; // e.g. 18.00 (%)
  tierCeiling: number;     // e.g. 15.00 (%)
  categoryCeiling: number; // e.g. 10.00 (%)
  allowedDiscount: number; // min(tierCeiling, categoryCeiling)
  lineExcess: number;      // max(0, appliedDiscount - allowedDiscount)
  lineTotal: number;
  lineWeight: number;      // lineTotal / quoteSubtotal
  weightedViolation: number; // lineExcess * lineWeight
  violationReason?: string;
}

export type ApprovalLevel = "NONE" | "SALES_MANAGER" | "FINANCE";

export interface EvaluationResult {
  quoteId: string;
  requiresApproval: boolean;
  riskScore: number;
  level: ApprovalLevel;
  requiredRole: Role;
  reason: string;
  quoteSubtotal: number;
  totalDiscountAmount: number;
  breakdown: LineEvaluationBreakdown[];
}

// Default tier ceilings when no DiscountRule is found
const DEFAULT_TIER_CEILINGS: Record<CustomerTier, number> = {
  PLATINUM: 20.0,
  GOLD: 15.0,
  SILVER: 10.0,
  BRONZE: 5.0,
};

export const blendedRiskService = {
  /**
   * Evaluates a quote using DB-driven discount ceilings and the blended risk algorithm.
   */
  async evaluateQuotation(quoteId: string): Promise<EvaluationResult> {
    // 1. Fetch quote and related customer, lines, and products
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        customer: true,
        lines: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!quote) {
      throw new Error(`Quote with id '${quoteId}' not found.`);
    }

    // 2. Fetch all discount rules from DB
    const discountRules = await prisma.discountRule.findMany();

    // Build lookup maps
    const ruleMap = new Map<string, { maxAutoApprovePct: number; requiredRole: Role }>();
    for (const rule of discountRules) {
      const key = `${rule.customerTier}:${rule.productCategory}`;
      ruleMap.set(key, {
        maxAutoApprovePct: decimalToNumber(rule.maxAutoApprovePct),
        requiredRole: rule.requiredRole,
      });
    }

    const customerTier = quote.customer.tier;
    const defaultTierCeiling = DEFAULT_TIER_CEILINGS[customerTier] ?? 5.0;

    // 3. Compute Subtotal across all lines
    let quoteSubtotal = 0;
    for (const line of quote.lines) {
      const subtotal = line.qty * decimalToNumber(line.unitPrice);
      quoteSubtotal += subtotal;
    }

    if (quoteSubtotal <= 0) {
      return {
        quoteId,
        requiresApproval: false,
        riskScore: 0,
        level: "NONE",
        requiredRole: Role.SALES_REP,
        reason: "Zero value quote, no approval required.",
        quoteSubtotal: 0,
        totalDiscountAmount: 0,
        breakdown: [],
      };
    }

    // 4. Evaluate each line
    let totalRiskScore = 0;
    let totalDiscountAmount = 0;
    const breakdown: LineEvaluationBreakdown[] = [];
    const violationReasons: string[] = [];
    let strictestRole: Role = Role.SALES_MANAGER;

    for (const line of quote.lines) {
      const product = line.product;
      const appliedDiscount = decimalToNumber(line.discountPct);
      const lineSubtotal = line.qty * decimalToNumber(line.unitPrice);
      const lineTotal = lineSubtotal * (1 - appliedDiscount / 100);

      const lineDiscountAmt = lineSubtotal * (appliedDiscount / 100);
      totalDiscountAmount += lineDiscountAmt;

      // Look up rule for this tier + category
      const ruleKey = `${customerTier}:${product.category}`;
      const rule = ruleMap.get(ruleKey);
      
      const tierCeiling = rule ? rule.maxAutoApprovePct : defaultTierCeiling;
      const categoryCeiling = tierCeiling; // same since we have one rule per tier+category

      // allowedDiscount = the rule's limit (or default)
      const allowedDiscount = Math.min(tierCeiling, categoryCeiling);

      // lineExcess = max(0, appliedDiscount - allowedDiscount)
      const lineExcess = Math.max(0, appliedDiscount - allowedDiscount);

      // lineWeight = lineTotal / quoteSubtotal
      const lineWeight = quoteSubtotal > 0 ? lineTotal / quoteSubtotal : 0;

      // weightedViolation = lineExcess * lineWeight
      const weightedViolation = lineExcess * lineWeight;

      totalRiskScore += weightedViolation;

      // Track strictest required role
      if (rule && lineExcess > 0) {
        const roleRank: Record<Role, number> = {
          CUSTOMER: -1,
          SALES_REP: 0,
          SALES_MANAGER: 1,
          FINANCE: 2,
          ADMIN: 3,
        };
        if (roleRank[rule.requiredRole] > roleRank[strictestRole]) {
          strictestRole = rule.requiredRole;
        }
      }

      let reason: string | undefined = undefined;
      if (lineExcess > 0) {
        reason = `${product.name} discount (${appliedDiscount}%) exceeds ${customerTier} ceiling (${tierCeiling}%) by ${lineExcess.toFixed(1)}%`;
        violationReasons.push(reason);
      }

      breakdown.push({
        lineId: line.id,
        productId: product.id,
        productName: product.name,
        category: product.category,
        quantity: line.qty,
        unitPrice: decimalToNumber(line.unitPrice),
        appliedDiscount: Math.round(appliedDiscount * 100) / 100,
        tierCeiling,
        categoryCeiling,
        allowedDiscount: Math.round(allowedDiscount * 100) / 100,
        lineExcess: Math.round(lineExcess * 100) / 100,
        lineTotal: Math.round(lineTotal * 100) / 100,
        lineWeight: Math.round(lineWeight * 10000) / 10000,
        weightedViolation: Math.round(weightedViolation * 100) / 100,
        violationReason: reason,
      });
    }

    const roundedRiskScore = Math.round(totalRiskScore * 100) / 100;

    // 5. Determine required approval level
    let level: ApprovalLevel = "NONE";
    let requiredRole: Role = Role.SALES_REP;

    if (roundedRiskScore > 0) {
      if (roundedRiskScore <= 5.0) {
        level = "SALES_MANAGER";
        requiredRole = strictestRole === Role.FINANCE || strictestRole === Role.ADMIN
          ? strictestRole : Role.SALES_MANAGER;
      } else {
        level = "FINANCE";
        requiredRole = Role.FINANCE;
      }
    }

    const requiresApproval = level !== "NONE";

    const summaryReason =
      violationReasons.length > 0
        ? violationReasons.slice(0, 2).join("; ") + (violationReasons.length > 2 ? ` (+${violationReasons.length - 2} more)` : "")
        : "All line discounts within approved tier and category ceilings.";

    return {
      quoteId,
      requiresApproval,
      riskScore: roundedRiskScore,
      level,
      requiredRole,
      reason: summaryReason,
      quoteSubtotal: Math.round(quoteSubtotal * 100) / 100,
      totalDiscountAmount: Math.round(totalDiscountAmount * 100) / 100,
      breakdown,
    };
  },
};
