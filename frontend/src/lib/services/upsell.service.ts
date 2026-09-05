/**
 * Upsell Service — fetches co-purchase data and runs the upsell engine
 */

import { prisma } from '@/lib/db/prisma';
import { runUpsellEngine } from '@/lib/engines/upsell.engine';

export async function getUpsellSuggestions(quoteId: string) {
  const quote = await prisma.quote.findUniqueOrThrow({
    where: { id: quoteId },
    include: {
      quoteLines: { include: { product: { include: { category: true } } } },
    },
  });

  const existingProductIds = quote.quoteLines.map(l => l.productId);

  // Fetch co-purchase candidates
  const coPurchases = await prisma.productCoPurchase.findMany({
    where: { productId: { in: existingProductIds } },
    include: {
      coProduct: { include: { category: true } },
    },
  });

  // Also check upsell rules for active promotions
  const upsellRules = await prisma.upsellRule.findMany({
    where: {
      productId: { in: existingProductIds },
      active: true,
    },
    include: { suggestedProduct: { include: { category: true } } },
  });

  const promotionSet = new Set(upsellRules.map(r => r.suggestedProductId));

  // Deduplicate candidates by productId (take highest frequency)
  const candidateMap = new Map<string, {
    productId: string;
    productName: string;
    categoryName: string;
    coPurchaseFrequency: number;
    hasActivePromotion: boolean;
    candidateMarginPercent: number;
    basePrice: number;
  }>();

  for (const cp of coPurchases) {
    const product = cp.coProduct;
    if (existingProductIds.includes(product.id)) continue; // skip already-on-quote items

    const basePrice = Number(product.basePrice);
    const costPrice = Number(product.costPrice);
    const margin = basePrice > 0 ? ((basePrice - costPrice) / basePrice) * 100 : 0;

    const existing = candidateMap.get(product.id);
    const freq = Number(cp.frequency);

    if (!existing || freq > existing.coPurchaseFrequency) {
      candidateMap.set(product.id, {
        productId: product.id,
        productName: product.name,
        categoryName: product.category?.name ?? 'Unknown',
        coPurchaseFrequency: freq,
        hasActivePromotion: promotionSet.has(product.id),
        candidateMarginPercent: Math.round(margin * 100) / 100,
        basePrice,
      });
    }
  }

  const candidates = Array.from(candidateMap.values());

  return runUpsellEngine({ existingProductIds, candidates });
}
