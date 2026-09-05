/**
 * ENGINE 8 — Upsell / Cross-Sell Engine (pure function)
 *
 * Scoring formula (documented):
 *   score = (coPurchaseFrequency × 0.6)    ← weighted most heavily
 *           + (hasPromotion ? 0.25 : 0)     ← promotion bonus
 *           + (marginDelta × 0.15)           ← smaller margin bonus
 *
 * Hard filter BEFORE ranking (non-negotiable):
 *   Exclude any candidate whose margin falls below MIN_ACCEPTABLE_MARGIN (15%)
 *   A high co-purchase score NEVER overrides below-threshold margin.
 *
 * Output: top-N ranked suggestions with human-readable reason strings
 * Frame as "customers who bought X also bought Y" — not "AI recommends"
 *
 * Worked examples:
 *   1. Candidate A: freq=0.8, promo=true, marginDelta=25% → score=(0.48+0.25+0.0375)=0.77
 *   2. Candidate B: freq=0.9, promo=false, marginDelta=5%  → score=(0.54+0+0.0075)=0.55
 *   3. Candidate C: freq=0.95, promo=true, marginDelta=-2% (below 15% margin floor)
 *      → FILTERED OUT before ranking (margin too low)
 *   4. Candidate D: freq=0.3, promo=false, marginDelta=20% → score=0.18+0+0.03=0.21
 *   5. Result: A (0.77) > B (0.55) > D (0.21) — C excluded
 */

const CO_PURCHASE_WEIGHT = 0.6;
const PROMOTION_BONUS = 0.25;
const MARGIN_WEIGHT = 0.15;
const MIN_ACCEPTABLE_MARGIN = 15;   // percent (same floor as risk engine)
const MAX_SUGGESTIONS = 5;

export interface CoPurchaseCandidate {
  productId: string;
  productName: string;
  categoryName: string;
  coPurchaseFrequency: number;    // 0.0–1.0 (ratio of times bought together)
  hasActivePromotion: boolean;
  candidateMarginPercent: number; // what margin this product would yield
  basePrice: number;
}

export interface UpsellEngineInput {
  existingProductIds: string[];   // products already on the quote
  candidates: CoPurchaseCandidate[];
  topN?: number;
}

export interface UpsellSuggestion {
  productId: string;
  productName: string;
  categoryName: string;
  score: number;
  reason: string;                  // human-readable, "customers who bought X also bought Y"
  marginPercent: number;
  hasActivePromotion: boolean;
  basePrice: number;
}

export interface UpsellEngineOutput {
  suggestions: UpsellSuggestion[];
  filteredOutCount: number;        // how many were excluded for low margin (for transparency)
}

export function runUpsellEngine(input: UpsellEngineInput): UpsellEngineOutput {
  const { candidates, topN = MAX_SUGGESTIONS } = input;

  let filteredOutCount = 0;
  const scoredCandidates: Array<UpsellSuggestion & { rawScore: number }> = [];

  for (const candidate of candidates) {
    // Hard filter FIRST: exclude below-margin candidates unconditionally
    if (candidate.candidateMarginPercent < MIN_ACCEPTABLE_MARGIN) {
      filteredOutCount++;
      continue;
    }

    // Normalize margin contribution (cap at 50% for scoring)
    const normalizedMargin = Math.min(candidate.candidateMarginPercent, 50) / 50;

    const rawScore = round3(
      candidate.coPurchaseFrequency * CO_PURCHASE_WEIGHT +
      (candidate.hasActivePromotion ? PROMOTION_BONUS : 0) +
      normalizedMargin * MARGIN_WEIGHT
    );

    // Build human-readable reason (statistics-based, not "AI recommends")
    let reason = `Frequently purchased alongside your selected products`;
    if (candidate.hasActivePromotion) {
      reason += ` — currently on promotion`;
    }

    scoredCandidates.push({
      productId: candidate.productId,
      productName: candidate.productName,
      categoryName: candidate.categoryName,
      score: rawScore,
      reason,
      marginPercent: candidate.candidateMarginPercent,
      hasActivePromotion: candidate.hasActivePromotion,
      basePrice: candidate.basePrice,
      rawScore,
    });
  }

  // Sort by score descending, take top N
  const suggestions = scoredCandidates
    .sort((a, b) => b.rawScore - a.rawScore)
    .slice(0, topN)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(({ rawScore, ...s }) => s);

  return { suggestions, filteredOutCount };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export const UPSELL_THRESHOLDS = {
  MIN_ACCEPTABLE_MARGIN,
  CO_PURCHASE_WEIGHT,
  PROMOTION_BONUS,
  MARGIN_WEIGHT,
};
