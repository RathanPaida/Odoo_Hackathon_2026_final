// src/lib/services/discount.ts
// Spec §6.2 — discount governance and approval routing decisions.
// Pure decision logic; side effects (DB writes, audit) live in approval.ts.
import { Prisma, DiscountRule, CustomerTier, Role } from "@prisma/client";

// Role hierarchy used to pick the "strictest" required role.
// Higher rank = stricter approval.
export const ROLE_RANK: Record<Role, number> = {
  SALES_REP: 0,
  SALES_MANAGER: 1,
  FINANCE: 2,
  ADMIN: 3,
};

/** Available role choices for a "requiredRole" — cannot be SALES_REP. */
export const APPROVER_ROLES: Role[] = ["SALES_MANAGER", "FINANCE", "ADMIN"];

export interface RoutingDecision {
  autoApprove: boolean;
  requiredRole: Role; // only meaningful when autoApprove is false
  applicableRules: DiscountRule[];
}

/**
 * Evaluate §6.2 for a set of lines.
 *
 * For each line:
 *  - look up DiscountRule for (customerTier, product.category)
 *  - a line with no matching rule is treated as a zero-tolerance rule:
 *    maxAutoApprovePct = 0, requiredRole = ADMIN
 *
 * Auto-approve iff EVERY line discountPct ≤ its rule's maxAutoApprovePct
 * AND blendedDiscountPct ≤ the highest applicable maxAutoApprovePct.
 * Otherwise the strictest matched rule's requiredRole must approve.
 */
export function evaluateDiscountRouting(params: {
  customerTier: CustomerTier;
  lines: Array<{
    productCategory: string;
    discountPct: DecimalInput;
  }>;
  blendedDiscountPct: Prisma.Decimal;
  rules: DiscountRule[];
}): RoutingDecision {
  const { customerTier, lines, blendedDiscountPct, rules } = params;

  const ruleFor = (category: string): DiscountRule | undefined =>
    rules.find(
      (r) =>
        r.customerTier === customerTier && r.productCategory === category
    );

  const effectiveRules = lines.map((line) => {
    const matched = ruleFor(line.productCategory);
    if (matched) return matched;
    // No governing rule → zero tolerance, requires highest role.
    return {
      id: `synthetic:${customerTier}:${line.productCategory}`,
      customerTier,
      productCategory: line.productCategory,
      maxAutoApprovePct: new Prisma.Decimal(0),
      requiredRole: Role.ADMIN,
    } as DiscountRule;
  });

  const everyLineWithinLimit = lines.every(
    (line, i) =>
      dec2(line.discountPct).lte(effectiveRules[i].maxAutoApprovePct)
  );

  const highestAutoApprove = effectiveRules.reduce(
    (max, r) => (r.maxAutoApprovePct.greaterThan(max) ? r.maxAutoApprovePct : max),
    new Prisma.Decimal(0)
  );

  const blendedWithinLimit = blendedDiscountPct.lte(highestAutoApprove);

  if (everyLineWithinLimit && blendedWithinLimit) {
    return { autoApprove: true, requiredRole: Role.SALES_MANAGER, applicableRules: effectiveRules };
  }

  // Strictest = highest role rank among matched rules.
  const requiredRole = effectiveRules.reduce<Role>((strict, r) =>
    ROLE_RANK[r.requiredRole] > ROLE_RANK[strict] ? r.requiredRole : strict
  , Role.SALES_MANAGER);

  return { autoApprove: false, requiredRole, applicableRules: effectiveRules };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type DecimalInput = string | number | Prisma.Decimal;

export function dec2(value: DecimalInput): Prisma.Decimal {
  return value instanceof Prisma.Decimal
    ? value
    : new Prisma.Decimal(String(value));
}

/** Query the discount rules governing a customer tier × category set. */
export async function loadDiscountRules(
  tier: CustomerTier,
  categories: string[]
): Promise<DiscountRule[]> {
  const { prisma } = await import("@/lib/db");
  if (categories.length === 0) return [];
  return prisma.discountRule.findMany({ where: { customerTier: tier } });
}