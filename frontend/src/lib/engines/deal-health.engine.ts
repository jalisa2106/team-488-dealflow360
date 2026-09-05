/**
 * ENGINE 10 — Deal Health Engine (pure function)
 *
 * IMPORTANT: Distinct from per-quote Risk Engine.
 *   Risk Engine asks: "should this submission need approval right now?"
 *   Deal Health asks: "is this deal, over time, showing signs of dying?"
 *   Reusing the same score would label every large approved deal as "risky" forever.
 *
 * Scoring signals (additive, documented):
 *   1. Stall/inactivity:   +5 pts per 7-day block of inactivity (max +20)
 *   2. Discount anomaly:   +8 pts if this deal's discount is >10pp above rep's avg
 *   3. Approval delay:     +10 pts if any approval pending > 24 hours
 *   4. Inventory/delivery: +10 pts if multi-warehouse; +15 if slipped delivery date
 *   5. Negotiation churn:  +5 pts per counter after the 3rd (max +20)
 *
 * Health bands (documented):
 *   0-9   → HEALTHY
 *   10-19 → WATCH
 *   20-34 → AT_RISK
 *   35+   → CRITICAL
 *
 * Worked examples:
 *   1. New quote, no issues → score=0, HEALTHY
 *   2. Stalled 15 days, no other issues → stall=10 pts, WATCH
 *   3. Compliant discount BUT stalled 14 days + approval pending 30h:
 *      → stall=10 + approval=10 = 20 pts, AT_RISK (demonstrates separation from Risk Engine)
 *   4. 5 negotiation counters, discount anomaly → churn=10 + anomaly=8 = 18 pts, WATCH
 *   5. Critical: stalled 30 days + slipped delivery + 6 counters → 20+15+15=50, CRITICAL
 */

export interface DealHealthInput {
  quoteId: string;
  daysSinceLastActivity: number;
  repAvgDiscountPercent: number;        // rep's historical average
  quoteDiscountPercent: number;         // this deal's effective discount
  pendingApprovalAgeHours: number | null; // null if no pending approval
  warehouseCount: number;               // from fulfillment
  deliveryDateSlipped: boolean;
  negotiationCounterCount: number;      // total back-and-forth counters
}

export type HealthLevel = 'HEALTHY' | 'WATCH' | 'AT_RISK' | 'CRITICAL';

export interface HealthSignalReason {
  signal: 'STALL' | 'DISCOUNT_ANOMALY' | 'APPROVAL_DELAY' | 'INVENTORY_DELIVERY' | 'NEGOTIATION_CHURN';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  points: number;
}

export interface DealHealthOutput {
  score: number;
  level: HealthLevel;
  reasons: HealthSignalReason[];
}

// Thresholds (documented for consistency with seed data)
const STALL_POINTS_PER_WEEK = 5;
const STALL_MAX_POINTS = 20;
const DISCOUNT_ANOMALY_THRESHOLD_PP = 10;  // percentage points above rep average
const DISCOUNT_ANOMALY_POINTS = 8;
const APPROVAL_DELAY_HOURS = 24;
const APPROVAL_DELAY_POINTS = 10;
const MULTI_WAREHOUSE_POINTS = 10;
const SLIPPED_DELIVERY_POINTS = 15;
const CHURN_FREE_COUNTERS = 3;             // first 3 counters don't add points
const CHURN_POINTS_PER_COUNTER = 5;
const CHURN_MAX_POINTS = 20;

const HEALTH_BANDS: Array<[number, HealthLevel]> = [
  [35, 'CRITICAL'],
  [20, 'AT_RISK'],
  [10, 'WATCH'],
  [0, 'HEALTHY'],
];

export function runDealHealthEngine(input: DealHealthInput): DealHealthOutput {
  const reasons: HealthSignalReason[] = [];
  let score = 0;

  // Signal 1: Stall / inactivity
  if (input.daysSinceLastActivity >= 7) {
    const weeks = Math.floor(input.daysSinceLastActivity / 7);
    const pts = Math.min(weeks * STALL_POINTS_PER_WEEK, STALL_MAX_POINTS);
    score += pts;
    reasons.push({
      signal: 'STALL',
      severity: pts >= 15 ? 'HIGH' : 'MEDIUM',
      message: `No activity for ${input.daysSinceLastActivity} days — deal may be stalling`,
      points: pts,
    });
  }

  // Signal 2: Discount anomaly vs rep's historical average
  const discountAnomaly = input.quoteDiscountPercent - input.repAvgDiscountPercent;
  if (discountAnomaly > DISCOUNT_ANOMALY_THRESHOLD_PP) {
    score += DISCOUNT_ANOMALY_POINTS;
    reasons.push({
      signal: 'DISCOUNT_ANOMALY',
      severity: 'MEDIUM',
      message: `Discount is ${discountAnomaly.toFixed(1)}pp above this rep's historical average (${input.repAvgDiscountPercent.toFixed(1)}%)`,
      points: DISCOUNT_ANOMALY_POINTS,
    });
  }

  // Signal 3: Approval sitting too long
  if (input.pendingApprovalAgeHours !== null && input.pendingApprovalAgeHours > APPROVAL_DELAY_HOURS) {
    score += APPROVAL_DELAY_POINTS;
    reasons.push({
      signal: 'APPROVAL_DELAY',
      severity: 'HIGH',
      message: `Approval has been pending for ${Math.round(input.pendingApprovalAgeHours)}h — above the ${APPROVAL_DELAY_HOURS}h threshold`,
      points: APPROVAL_DELAY_POINTS,
    });
  }

  // Signal 4: Inventory / delivery risk
  if (input.deliveryDateSlipped) {
    score += SLIPPED_DELIVERY_POINTS;
    reasons.push({
      signal: 'INVENTORY_DELIVERY',
      severity: 'HIGH',
      message: 'Promised delivery date has slipped — fulfillment risk elevated',
      points: SLIPPED_DELIVERY_POINTS,
    });
  } else if (input.warehouseCount >= 2) {
    score += MULTI_WAREHOUSE_POINTS;
    reasons.push({
      signal: 'INVENTORY_DELIVERY',
      severity: 'MEDIUM',
      message: `Fulfillment requires ${input.warehouseCount} warehouses, increasing delivery complexity`,
      points: MULTI_WAREHOUSE_POINTS,
    });
  }

  // Signal 5: Negotiation churn
  const extraCounters = Math.max(0, input.negotiationCounterCount - CHURN_FREE_COUNTERS);
  if (extraCounters > 0) {
    const pts = Math.min(extraCounters * CHURN_POINTS_PER_COUNTER, CHURN_MAX_POINTS);
    score += pts;
    reasons.push({
      signal: 'NEGOTIATION_CHURN',
      severity: pts >= 15 ? 'HIGH' : 'MEDIUM',
      message: `${input.negotiationCounterCount} negotiation rounds without convergence — deal is churning`,
      points: pts,
    });
  }

  const level = mapHealthLevel(score);

  return { score, level, reasons };
}

function mapHealthLevel(score: number): HealthLevel {
  for (const [threshold, level] of HEALTH_BANDS) {
    if (score >= threshold) return level;
  }
  return 'HEALTHY';
}

export const DEAL_HEALTH_THRESHOLDS = {
  STALL_POINTS_PER_WEEK,
  STALL_MAX_POINTS,
  DISCOUNT_ANOMALY_THRESHOLD_PP,
  DISCOUNT_ANOMALY_POINTS,
  APPROVAL_DELAY_HOURS,
  APPROVAL_DELAY_POINTS,
  MULTI_WAREHOUSE_POINTS,
  SLIPPED_DELIVERY_POINTS,
  CHURN_FREE_COUNTERS,
  CHURN_POINTS_PER_COUNTER,
  HEALTH_BANDS,
};
