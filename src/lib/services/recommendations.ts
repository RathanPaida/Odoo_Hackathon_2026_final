// src/lib/services/recommendations.ts
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma";

export async function getRecommendationsForQuote(quotationId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quotationId },
    include: { lines: { include: { product: true } } },
  });

  if (!quote || quote.lines.length === 0) return [];

  // Get categories of products currently in the quote
  const currentCategories = Array.from(new Set(quote.lines.map((l) => l.product.category)));
  const currentProductIds = new Set(quote.lines.map((l) => l.productId));

  // Find UpsellRules triggered by these categories
  const rules = await prisma.upsellRule.findMany({
    where: { triggerCategory: { in: currentCategories } },
  });

  const recProducts = await prisma.product.findMany({
    where: { id: { in: rules.map((r) => r.recommendedProductId) } },
  });
  
  const productMap = new Map(recProducts.map((p) => [p.id, p]));

  // Score weights
  const W1 = 0.5; // Co-purchase/Priority score
  const W2 = 0.2; // Promotion score (mocked for now, assuming high margin = promoted)
  const W3 = 0.3; // Margin score

  const recommendations = [];

  for (const rule of rules) {
    const p = productMap.get(rule.recommendedProductId);
    if (!p) continue;
    // Don't recommend something they already have in the cart
    if (currentProductIds.has(p.id)) continue;

    const listPrice = Number(p.listPrice);
    const cost = Number(p.unitCost);
    
    const marginAmt = listPrice - cost;
    const marginPct = listPrice > 0 ? (marginAmt / listPrice) * 100 : 0;

    // Filter: only recommend where expectedMargin >= product.minimumMargin
    if (marginPct < Number(p.minimumMargin || 0)) continue;

    // Normalize inputs to a 0-1 scale for scoring
    const coPurchaseScore = rule.priority ? (10 / rule.priority) / 10 : 0.5; // Lower priority number = better
    const marginScore = Math.min(marginPct / 100, 1);
    const promotionScore = marginPct > 40 ? 1 : 0; // Fake promotion signal

    const score = (W1 * coPurchaseScore) + (W2 * promotionScore) + (W3 * marginScore);

    recommendations.push({
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      listPrice: p.listPrice,
      score: score.toFixed(2),
      reason: `Frequently purchased with ${rule.triggerCategory}`,
      promotion: promotionScore > 0,
      marginDelta: marginAmt.toFixed(2),
    });
  }

  // Sort by score descending and deduplicate by productId
  const uniqueRecs = Array.from(
    new Map(recommendations.map(r => [r.productId, r])).values()
  ).sort((a, b) => Number(b.score) - Number(a.score));

  return uniqueRecs.slice(0, 3); // Top 3 recommendations
}
