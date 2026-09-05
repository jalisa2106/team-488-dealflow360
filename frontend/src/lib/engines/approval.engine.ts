/**
 * ENGINE 5 — Approval Engine (pure function)
 *
 * Core mapping (documented):
 *   LOW      → no approval needed (straight to APPROVED)
 *   MEDIUM   → SALES_MANAGER approval required
 *   HIGH     → SALES_MANAGER, then FINANCE (sequential)
 *   CRITICAL → SALES_MANAGER, then FINANCE (sequential)
 *
 * Hard-violation floor (closes dilution loophole):
 *   If ANY line violates its category ceiling by > HARD_VIOLATION_THRESHOLD (5%),
 *   force at least SALES_MANAGER approval, even if blended score lands in LOW.
 *   This prevents: many compliant lines diluting one very bad line in blended score.
 *
 * Re-approval invariant (enforced in service layer, documented here):
 *   Once a quote is approved, if re-evaluated and new approval requirement is
 *   HIGHER or DIFFERENT → create a NEW approval request, never mutate old ones.
 *
 * Worked examples:
 *   1. score=5 (LOW), no hard violations → approvalRequired=false, roles=[]
 *   2. score=14 (MEDIUM) → approvalRequired=true, roles=['SALES_MANAGER']
 *   3. score=25 (HIGH) → approvalRequired=true, roles=['SALES_MANAGER','FINANCE']
 *   4. score=8 (LOW), but Service line 8% over category ceiling (hard violation floor):
 *      → approvalRequired=true, roles=['SALES_MANAGER'] (floor override)
 *   5. One $10k line with 8% overage + ten $10 lines compliant → score=~8 (LOW),
 *      but 8% hard-violation → forced SALES_MANAGER (closes the loophole)
 */

import type { RiskLevel } from './risk.engine';

// Hard-violation floor threshold (documented, used in seed data)
const HARD_VIOLATION_THRESHOLD = 5; // percent

export interface ApprovalEngineInput {
  riskLevel: RiskLevel;
  lineOverages: Array<{
    lineId: string;
    overagePercent: number;
    productName: string;
  }>;
}

export interface ApprovalEngineOutput {
  approvalRequired: boolean;
  requiredRoles: Array<'SALES_MANAGER' | 'FINANCE'>;
  triggeredByHardViolation: boolean;   // for explainability
  hardViolatingLines: string[];        // lineIds that triggered floor
}

const ROLE_MAP: Record<RiskLevel, Array<'SALES_MANAGER' | 'FINANCE'>> = {
  LOW: [],
  MEDIUM: ['SALES_MANAGER'],
  HIGH: ['SALES_MANAGER', 'FINANCE'],
  CRITICAL: ['SALES_MANAGER', 'FINANCE'],
};

export function runApprovalEngine(input: ApprovalEngineInput): ApprovalEngineOutput {
  const { riskLevel, lineOverages } = input;

  // Step 1: Base routing from risk level
  const baseRoles = ROLE_MAP[riskLevel];

  // Step 2: Hard-violation floor check (closes dilution loophole)
  const hardViolatingLines = lineOverages
    .filter(l => l.overagePercent > HARD_VIOLATION_THRESHOLD)
    .map(l => l.lineId);

  const triggeredByHardViolation = hardViolatingLines.length > 0 && baseRoles.length === 0;

  // If hard violation but score was LOW, force SALES_MANAGER
  const finalRoles: Array<'SALES_MANAGER' | 'FINANCE'> = triggeredByHardViolation
    ? ['SALES_MANAGER']
    : baseRoles;

  return {
    approvalRequired: finalRoles.length > 0,
    requiredRoles: finalRoles,
    triggeredByHardViolation,
    hardViolatingLines,
  };
}

export const APPROVAL_THRESHOLDS = {
  HARD_VIOLATION_THRESHOLD,
  ROLE_MAP,
};
