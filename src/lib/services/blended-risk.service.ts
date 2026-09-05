import { prisma } from "@/lib/db";
import { ApprovalLevel, ApprovalOutcome, CustomerTier, Prisma, Role } from "@/generated/prisma";
import { decimalToNumber, toDecimal } from "@/lib/api-response";

export interface LineEvaluationBreakdown {
  lineId: string;
  productId: string;
  productName: string;
  categoryId: string;
  categoryName: string;
  quantity: number;
  unitPrice: number;
  appliedDiscount: number; // e.g. 18.00 (%)
  tierCeiling: number;     // e.g. 15.00 (%)
  categoryCeiling: number; // e.g. 10.00 (%)
  allowedDiscount: number; // min(tierCeiling, categoryCeiling)
  lineExcess: number;      // max(0, appliedDiscount - allowedDiscount)
  lineTotal: number;
  lineWeight: number;      // lineTotal / quotationSubtotal
  weightedViolation: number; // lineExcess * lineWeight
  violationReason?: string;
}

export interface EvaluationResult {
  quotationId: string;
  requiresApproval: boolean;
  riskScore: number;
  level: ApprovalLevel;
  status: ApprovalOutcome;
  reason: string;
  quotationSubtotal: number;
  totalDiscountAmount: number;
  breakdown: LineEvaluationBreakdown[];
}

export const blendedRiskService = {
  /**
   * Evaluates a quotation using DB-driven discount ceilings and the Section 13 algorithm.
   */
  async evaluateQuotation(quotationId: string): Promise<EvaluationResult> {
    // 1. Fetch quotation and related customer, lines, and products
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        customer: true,
        lines: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    if (!quotation) {
      throw new Error(`Quotation with id '${quotationId}' not found.`);
    }

    // 2. Fetch all active discount rules from DB
    const [tierCeilings, categoryRules, approvalRules] = await Promise.all([
      prisma.discountTier.findMany({ where: { active: true } }),
      prisma.categoryDiscountRule.findMany({ where: { active: true } }),
      prisma.approvalRule.findMany({ where: { active: true }, orderBy: { minimumRiskScore: "asc" } }),
    ]);

    const tierMap = new Map<CustomerTier, number>();
    for (const t of tierCeilings) {
      tierMap.set(t.customerTier, decimalToNumber(t.maximumDiscount));
    }

    const catMap = new Map<string, number>();
    for (const c of categoryRules) {
      catMap.set(c.categoryId, decimalToNumber(c.maximumDiscount));
    }

    // Default tier ceilings if not seeded yet
    const customerTier = quotation.customer.customerTier;
    const defaultTierCeiling =
      customerTier === CustomerTier.GOLD ? 15.0 : customerTier === CustomerTier.SILVER ? 10.0 : 5.0;
    const effectiveTierCeiling = tierMap.get(customerTier) ?? defaultTierCeiling;

    // 3. Compute Subtotal across all lines
    let quotationSubtotal = 0;
    for (const line of quotation.lines) {
      const subtotal = decimalToNumber(line.lineSubtotal) || (line.quantity * decimalToNumber(line.unitPrice));
      quotationSubtotal += subtotal;
    }

    if (quotationSubtotal <= 0) {
      // Degenerate case (e.g. empty or 0 total quotation)
      return {
        quotationId,
        requiresApproval: false,
        riskScore: 0,
        level: ApprovalLevel.NONE,
        status: ApprovalOutcome.APPROVED,
        reason: "Zero value quotation, no approval required.",
        quotationSubtotal: 0,
        totalDiscountAmount: 0,
        breakdown: [],
      };
    }

    // 4. Evaluate each line according to Section 13 algorithm
    let totalRiskScore = 0;
    let totalDiscountAmount = 0;
    const breakdown: LineEvaluationBreakdown[] = [];
    const violationReasons: string[] = [];

    for (const line of quotation.lines) {
      const product = line.product;
      const categoryId = product.categoryId;
      const categoryName = product.category?.name ?? "General";
      const appliedDiscount = decimalToNumber(line.discountPercentage);
      const lineSubtotal = decimalToNumber(line.lineSubtotal) || (line.quantity * decimalToNumber(line.unitPrice));
      const lineTotal = decimalToNumber(line.lineTotal) || (lineSubtotal * (1 - appliedDiscount / 100));

      const lineDiscountAmt = decimalToNumber(line.discountAmount) || (lineSubtotal * (appliedDiscount / 100));
      totalDiscountAmount += lineDiscountAmt;

      // Category ceiling (default 10% if not configured)
      const categoryCeiling = catMap.get(categoryId) ?? 10.0;

      // Stricter wins: allowedDiscount = min(tierCeiling, categoryCeiling)
      const allowedDiscount = Math.min(effectiveTierCeiling, categoryCeiling);

      // lineExcess = max(0, appliedDiscount - allowedDiscount)
      const lineExcess = Math.max(0, appliedDiscount - allowedDiscount);

      // lineWeight = lineTotal / quotationSubtotal
      const lineWeight = quotationSubtotal > 0 ? lineTotal / quotationSubtotal : 0;

      // weightedViolation = lineExcess * lineWeight
      const weightedViolation = lineExcess * lineWeight;

      totalRiskScore += weightedViolation;

      let reason: string | undefined = undefined;
      if (lineExcess > 0) {
        if (categoryCeiling < effectiveTierCeiling) {
          reason = `${product.name} discount (${appliedDiscount}%) exceeds '${categoryName}' category ceiling (${categoryCeiling}%) by ${lineExcess.toFixed(1)}%`;
        } else {
          reason = `${product.name} discount (${appliedDiscount}%) exceeds ${customerTier} tier ceiling (${effectiveTierCeiling}%) by ${lineExcess.toFixed(1)}%`;
        }
        violationReasons.push(reason);
      }

      breakdown.push({
        lineId: line.id,
        productId: product.id,
        productName: product.name,
        categoryId,
        categoryName,
        quantity: line.quantity,
        unitPrice: decimalToNumber(line.unitPrice),
        appliedDiscount: Math.round(appliedDiscount * 100) / 100,
        tierCeiling: effectiveTierCeiling,
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

    // 5. Look up matching ApprovalRule from database
    let requiredLevel: ApprovalLevel = ApprovalLevel.NONE;

    if (roundedRiskScore > 0) {
      if (approvalRules.length > 0) {
        // Find matching rule by range
        for (const rule of approvalRules) {
          const min = decimalToNumber(rule.minimumRiskScore);
          const max = decimalToNumber(rule.maximumRiskScore);
          if (roundedRiskScore >= min && roundedRiskScore <= max) {
            requiredLevel = rule.requiredApprovalLevel;
            break;
          }
        }
        // If score exceeds all configured rules, escalate to FINANCE
        if (requiredLevel === ApprovalLevel.NONE) {
          requiredLevel = ApprovalLevel.FINANCE;
        }
      } else {
        // Standard fallback if rules not yet seeded in DB:
        // score <= 0 -> NONE, score <= 30 -> MANAGER, score > 30 -> FINANCE
        if (roundedRiskScore <= 30) {
          requiredLevel = ApprovalLevel.MANAGER;
        } else {
          requiredLevel = ApprovalLevel.FINANCE;
        }
      }
    }

    const requiresApproval = requiredLevel !== ApprovalLevel.NONE;
    const status: ApprovalOutcome = requiresApproval
      ? ApprovalOutcome.PENDING_APPROVAL
      : ApprovalOutcome.APPROVED;

    const summaryReason =
      violationReasons.length > 0
        ? violationReasons.slice(0, 2).join("; ") + (violationReasons.length > 2 ? ` (+${violationReasons.length - 2} more)` : "")
        : "All line discounts within approved tier and category ceilings.";

    return {
      quotationId,
      requiresApproval,
      riskScore: roundedRiskScore,
      level: requiredLevel,
      status,
      reason: summaryReason,
      quotationSubtotal: Math.round(quotationSubtotal * 100) / 100,
      totalDiscountAmount: Math.round(totalDiscountAmount * 100) / 100,
      breakdown,
    };
  },
};
