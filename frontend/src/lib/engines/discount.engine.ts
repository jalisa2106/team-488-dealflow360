/**
 * ENGINE 2 — Discount Engine (pure function)
 *
 * Worked examples:
 *   1. Gold customer, Hardware line, requested=12%, tierCeiling=15%, catCeiling=20%
 *      → allowed=15%, overage=0, binding=TIER (min of both is 15%)
 *   2. Gold customer, Service line, requested=18%, tierCeiling=15%, catCeiling=10%
 *      → allowed=10%, overage=8%, binding=CATEGORY
 *   3. Bronze customer, Hardware line, requested=5%, tierCeiling=5%, catCeiling=20%
 *      → allowed=5%, overage=0, binding=TIER
 *   4. Multi-line quote: Line A: Hardware overage=0; Line B: Service overage=8%
 *      → hasAnyOverage=true; record each independently (don't collapse to worst)
 *   5. Silver customer, Software line, requested=12%, tierCeiling=10%, catCeiling=15%
 *      → allowed=10%, overage=2%, binding=TIER
 *
 * Rules:
 *  - Take MORE RESTRICTIVE (smaller) of tier ceiling and category ceiling
 *  - Record EACH line's overage independently — never collapse to worst line only
 *  - Do NOT decide approval routing here — only produce overage numbers
 */

export interface DiscountLineInput {
  lineId: string;
  categoryId: string;
  requestedDiscountPercent: number;
  lineRevenue: number;           // subtotal for revenue-weighting in risk engine
  tierCeilingPercent: number;    // max discount for customer tier on this category
  categoryMaxPercent: number;    // max discount for this product category
}

export interface DiscountLineResult {
  lineId: string;
  requestedPercent: number;
  allowedPercent: number;
  overagePercent: number;        // max(0, requested - allowed)
  bindingRule: 'TIER' | 'CATEGORY' | 'NONE'; // which ceiling was binding
  inViolation: boolean;
}

export interface DiscountEngineInput {
  lines: DiscountLineInput[];
}

export interface DiscountEngineOutput {
  lineResults: DiscountLineResult[];
  hasAnyOverage: boolean;        // fast pre-check before expensive risk pass
}

export function runDiscountEngine(input: DiscountEngineInput): DiscountEngineOutput {
  const lineResults: DiscountLineResult[] = input.lines.map(line => {
    const { tierCeilingPercent, categoryMaxPercent, requestedDiscountPercent, lineId } = line;

    // Resolution rule: take MORE RESTRICTIVE (smaller) ceiling
    const allowedPercent = Math.min(tierCeilingPercent, categoryMaxPercent);
    const overagePercent = Math.max(0, round2(requestedDiscountPercent - allowedPercent));
    const inViolation = overagePercent > 0;

    // Record which ceiling was the binding constraint
    let bindingRule: DiscountLineResult['bindingRule'] = 'NONE';
    if (inViolation) {
      bindingRule = tierCeilingPercent <= categoryMaxPercent ? 'TIER' : 'CATEGORY';
    } else {
      // Even if no violation, record which would have been binding (for explainability)
      bindingRule = tierCeilingPercent <= categoryMaxPercent ? 'TIER' : 'CATEGORY';
    }

    return {
      lineId,
      requestedPercent: requestedDiscountPercent,
      allowedPercent,
      overagePercent,
      bindingRule,
      inViolation,
    };
  });

  return {
    lineResults,
    hasAnyOverage: lineResults.some(r => r.inViolation),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
