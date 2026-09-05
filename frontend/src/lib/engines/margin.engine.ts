/**
 * ENGINE 3 — Margin Calculation (pure function)
 *
 * KEY: margin percent is always against REVENUE, not cost.
 *      Dividing by cost gives "markup" — a different number.
 *
 * Worked examples:
 *   1. unitPrice=500, qty=4, discountPercent=0, costPrice=300
 *      → lineRevenue=2000, lineCost=1200, marginAmount=800, marginPercent=40%
 *   2. unitPrice=500, qty=4, discountPercent=10, costPrice=300
 *      → lineRevenue=1800, lineCost=1200, marginAmount=600, marginPercent=33.33%
 *   3. unitPrice=100, qty=10, discountPercent=15, costPrice=90  (deceptively thin margin)
 *      → lineRevenue=850, lineCost=900, marginAmount=-50, marginPercent=-5.88% (negative!)
 *   4. Multi-line: Line A: marginAmount=800, Line B: marginAmount=600
 *      → quoteMarginAmount=1400, quoteMarginPercent=1400/(2000+1800)=36.84%
 *   5. Gold+Service, unitPrice=1000, qty=2, discountPercent=18%, costPrice=600
 *      → lineRevenue=1640, lineCost=1200, marginAmount=440, marginPercent=26.83%
 */

export interface MarginLineInput {
  lineId: string;
  unitPrice: number;           // server-side base price (from Pricing Engine)
  quantity: number;
  discountPercent: number;     // AFTER ceiling check
  costPrice: number;           // never discounted
}

export interface MarginLineResult {
  lineId: string;
  lineRevenue: number;         // unitPrice × qty × (1 - discount/100)
  lineCost: number;            // costPrice × qty (never discounted)
  lineMarginAmount: number;    // lineRevenue - lineCost
  lineMarginPercent: number;   // lineMarginAmount / lineRevenue
}

export interface MarginEngineInput {
  lines: MarginLineInput[];
}

export interface MarginEngineOutput {
  lineResults: MarginLineResult[];
  quoteMarginAmount: number;   // sum of line margin amounts
  quoteTotalRevenue: number;   // sum of line revenues
  quoteMarginPercent: number;  // quoteMarginAmount / quoteTotalRevenue
}

export function runMarginEngine(input: MarginEngineInput): MarginEngineOutput {
  const lineResults: MarginLineResult[] = input.lines.map(line => {
    const { lineId, unitPrice, quantity, discountPercent, costPrice } = line;

    // Revenue = what customer actually pays (after discount)
    const lineRevenue = round2(unitPrice * quantity * (1 - discountPercent / 100));
    // Cost = what it costs us (never discounted)
    const lineCost = round2(costPrice * quantity);
    const lineMarginAmount = round2(lineRevenue - lineCost);
    // Margin % against revenue (not cost — that would be markup)
    const lineMarginPercent = lineRevenue !== 0
      ? round2((lineMarginAmount / lineRevenue) * 100)
      : 0;

    return { lineId, lineRevenue, lineCost, lineMarginAmount, lineMarginPercent };
  });

  const quoteMarginAmount = round2(lineResults.reduce((s, r) => s + r.lineMarginAmount, 0));
  const quoteTotalRevenue = round2(lineResults.reduce((s, r) => s + r.lineRevenue, 0));
  const quoteMarginPercent = quoteTotalRevenue !== 0
    ? round2((quoteMarginAmount / quoteTotalRevenue) * 100)
    : 0;

  return { lineResults, quoteMarginAmount, quoteTotalRevenue, quoteMarginPercent };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
