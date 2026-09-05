/**
 * ENGINE 4 — Risk Engine (pure function)
 *
 * Scoring components (additive, documented):
 *   A. Blended discount-violation score:
 *      For each violating line: (overagePercent × lineRevenueShare) summed across all lines
 *      Multiply by 100 for scale. Revenue-weighted so a $10k line violation scores more than $10 line.
 *   B. Margin risk: +10 pts if quoteMarginPercent < 15%
 *   C. Inventory risk: +15 pts if fulfillment needs 2+ warehouses; +25 pts if can't fully fulfill
 *
 * Risk bands (documented, used consistently in seed data + demo):
 *   0-9   → LOW
 *   10-19 → MEDIUM
 *   20-34 → HIGH
 *   35+   → CRITICAL
 *
 * Worked examples:
 *   1. Single line, Service, 18% requested, ceiling=10%, revenue=2000, totalRevenue=2000
 *      Overage=8%, revenueShare=1.0, discountScore=8×1.0=8.0
 *      marginPercent=30% (>15%), single warehouse
 *      → totalScore=8, level=LOW
 *   2. Same but marginPercent=12% (<15%)
 *      → totalScore=8+10=18, level=MEDIUM
 *   3. Two warehouses + 18% overage on full revenue
 *      → totalScore=8+15=23, level=HIGH
 *   4. Multiple small overages: Line A 3% over ($1000/5000), Line B 2% over ($2000/5000)
 *      discountScore = (3×0.2)+(2×0.4) = 0.6+0.8=1.4 → minimal score
 *   5. Critical: marginPercent=5%, unfulfillable, 8% overage full revenue
 *      → 8+10+25=43, level=CRITICAL
 */

export interface RiskLineInput {
  lineId: string;
  lineRevenue: number;
  overagePercent: number;     // from Discount Engine
  productName: string;
  categoryName: string;
}

export interface InventoryRiskInput {
  warehouseCount: number;     // number of warehouses needed
  fullyFulfillable: boolean;  // can the full qty be filled from existing stock
}

export interface RiskEngineInput {
  lines: RiskLineInput[];
  quoteMarginPercent: number;
  inventory: InventoryRiskInput;
}

export interface RiskReason {
  component: 'DISCOUNT' | 'MARGIN' | 'INVENTORY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  points: number;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RiskEngineOutput {
  score: number;
  level: RiskLevel;
  reasons: RiskReason[];
  discountViolationScore: number;
  marginRiskPoints: number;
  inventoryRiskPoints: number;
}

// Thresholds (documented for consistency with seed data and demo)
const MARGIN_FLOOR = 15;              // % — below this adds risk
const MARGIN_RISK_POINTS = 10;
const MULTI_WAREHOUSE_POINTS = 15;
const UNFULFILLABLE_POINTS = 25;
const SCORE_BANDS: Array<[number, RiskLevel]> = [
  [35, 'CRITICAL'],
  [20, 'HIGH'],
  [10, 'MEDIUM'],
  [0, 'LOW'],
];

export function runRiskEngine(input: RiskEngineInput): RiskEngineOutput {
  const { lines, quoteMarginPercent, inventory } = input;
  const reasons: RiskReason[] = [];

  // === Component A: Blended discount-violation score (revenue-weighted) ===
  const totalRevenue = lines.reduce((s, l) => s + l.lineRevenue, 0);
  let discountViolationScore = 0;

  for (const line of lines) {
    if (line.overagePercent > 0 && totalRevenue > 0) {
      const revenueShare = line.lineRevenue / totalRevenue;
      const lineScore = round2(line.overagePercent * revenueShare);
      discountViolationScore = round2(discountViolationScore + lineScore);

      const sev = line.overagePercent >= 10 ? 'HIGH' : line.overagePercent >= 5 ? 'MEDIUM' : 'LOW';
      reasons.push({
        component: 'DISCOUNT',
        severity: sev,
        message: `${line.productName} (${line.categoryName}) is ${line.overagePercent.toFixed(1)}% above its permitted discount ceiling`,
        points: round2(lineScore),
      });
    }
  }

  // === Component B: Margin risk ===
  let marginRiskPoints = 0;
  if (quoteMarginPercent < MARGIN_FLOOR) {
    marginRiskPoints = MARGIN_RISK_POINTS;
    reasons.push({
      component: 'MARGIN',
      severity: quoteMarginPercent < 0 ? 'CRITICAL' : 'HIGH',
      message: `Quote margin is ${quoteMarginPercent.toFixed(1)}%, below the ${MARGIN_FLOOR}% minimum threshold`,
      points: marginRiskPoints,
    });
  }

  // === Component C: Inventory risk ===
  let inventoryRiskPoints = 0;
  if (!inventory.fullyFulfillable) {
    inventoryRiskPoints = UNFULFILLABLE_POINTS;
    reasons.push({
      component: 'INVENTORY',
      severity: 'CRITICAL',
      message: 'Insufficient total stock to fully fulfill this order — backorder required',
      points: inventoryRiskPoints,
    });
  } else if (inventory.warehouseCount >= 2) {
    inventoryRiskPoints = MULTI_WAREHOUSE_POINTS;
    reasons.push({
      component: 'INVENTORY',
      severity: 'MEDIUM',
      message: `Fulfillment requires ${inventory.warehouseCount} warehouses, increasing shipping cost and complexity`,
      points: inventoryRiskPoints,
    });
  }

  const score = round2(discountViolationScore + marginRiskPoints + inventoryRiskPoints);
  const level = mapScoreToLevel(score);

  return {
    score,
    level,
    reasons,
    discountViolationScore,
    marginRiskPoints,
    inventoryRiskPoints,
  };
}

function mapScoreToLevel(score: number): RiskLevel {
  for (const [threshold, level] of SCORE_BANDS) {
    if (score >= threshold) return level;
  }
  return 'LOW';
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Export thresholds for use in seed data and tests
export const RISK_THRESHOLDS = {
  MARGIN_FLOOR,
  MARGIN_RISK_POINTS,
  MULTI_WAREHOUSE_POINTS,
  UNFULFILLABLE_POINTS,
  SCORE_BANDS,
};
