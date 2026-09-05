/**
 * ENGINE 9 — Negotiation Engine (pure function — re-evaluation core)
 *
 * Core invariant: customer counter-offer MUST run through the EXACT SAME
 * pricing → discount → margin → risk → approval pipeline as internal quotes.
 * No simplified "portal version" of calculations.
 *
 * Security: portal response is a DELIBERATELY RESTRICTED shape.
 * Never include: margin, internal risk score, approval reasoning, warehouse allocation.
 * (Checked at network tab level — not just CSS/JS hiding)
 *
 * Negotiable statuses: DRAFT, PENDING_APPROVAL, UNDER_NEGOTIATION
 * (APPROVED, CONFIRMED, CANCELLED, COMPLETED cannot be negotiated)
 *
 * Worked examples:
 *   1. Quote at LOW risk, customer proposes 5% more discount
 *      → re-eval → still LOW risk → no new approval → status stays, audit logged
 *   2. Quote was APPROVED (LOW risk), customer proposes +8% discount on Service
 *      → re-eval → HIGH risk → new approval request created → status → UNDER_NEGOTIATION
 *   3. Counter-offer on already-under-negotiation quote: same result, new audit entry
 *   4. Quote in CONFIRMED status → reject with "quote not negotiable" error
 *   5. Previously LOW→LOW: no approval needed, proceed; but always audit logged
 */

import type { RiskLevel } from './risk.engine';

export type NegotiableStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'UNDER_NEGOTIATION';
export const NEGOTIABLE_STATUSES: NegotiableStatus[] = ['DRAFT', 'PENDING_APPROVAL', 'UNDER_NEGOTIATION'];

export function isNegotiable(status: string): status is NegotiableStatus {
  return NEGOTIABLE_STATUSES.includes(status as NegotiableStatus);
}

export interface ProposedLineTerms {
  lineId: string;
  proposedDiscountPercent: number;
}

export interface NegotiationEngineInput {
  quoteId: string;
  quoteStatus: string;
  proposedTerms: ProposedLineTerms[];
  currentApprovalState: {
    lastApprovedRoles: Array<'SALES_MANAGER' | 'FINANCE'>;
  };
  // Re-evaluation results from running the full pipeline with proposed terms:
  newRiskLevel: RiskLevel;
  newRiskScore: number;
  newRequiredRoles: Array<'SALES_MANAGER' | 'FINANCE'>;
  newApprovalRequired: boolean;
}

export interface NegotiationDecision {
  isNegotiable: boolean;
  rejectReason?: string;
  requiresNewApproval: boolean;
  newRequiredRoles: Array<'SALES_MANAGER' | 'FINANCE'>;
  newQuoteStatus: string;
}

/**
 * Pure function: given re-evaluation results, decide what happens to the quote.
 * Service layer is responsible for: persisting negotiation record, creating approval
 * requests, writing audit log entry.
 */
export function runNegotiationDecision(input: NegotiationEngineInput): NegotiationDecision {
  // Step 1: Verify quote is in a negotiable status
  if (!isNegotiable(input.quoteStatus)) {
    return {
      isNegotiable: false,
      rejectReason: `Quote status "${input.quoteStatus}" does not permit negotiation. Only ${NEGOTIABLE_STATUSES.join(', ')} quotes can be negotiated.`,
      requiresNewApproval: false,
      newRequiredRoles: [],
      newQuoteStatus: input.quoteStatus,
    };
  }

  const { newApprovalRequired, newRequiredRoles } = input;

  // Re-approval invariant: if new requirement is HIGHER or DIFFERENT → create new approval request
  // (enforced in service layer — for hackathon: any negotiated change re-triggers approval)
  const requiresNewApproval = newApprovalRequired;

  const newQuoteStatus = requiresNewApproval ? 'UNDER_NEGOTIATION' : input.quoteStatus;

  return {
    isNegotiable: true,
    requiresNewApproval,
    newRequiredRoles,
    newQuoteStatus,
  };
}

/**
 * Build a RESTRICTED portal response shape.
 * Must NEVER include: marginPercent, riskScore, approvalReasoning, warehouseAllocation
 * This is a separate function to make the restriction explicit and testable.
 */
export interface PortalQuoteResponse {
  quoteId: string;
  quoteNumber: string;
  status: string;
  lines: Array<{
    lineId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    lineTotal: number;
  }>;
  total: number;
  message?: string;
}

export function buildPortalResponse(fullQuote: {
  id: string;
  quoteNumber: string;
  status: string;
  total: number;
  quoteLines: Array<{
    id: string;
    product: { name: string };
    quantity: number | string;
    unitPrice: number | string;
    discountPercent: number | string;
    lineTotal: number | string;
  }>;
}, message?: string): PortalQuoteResponse {
  return {
    quoteId: fullQuote.id,
    quoteNumber: fullQuote.quoteNumber,
    status: fullQuote.status,
    lines: fullQuote.quoteLines.map(l => ({
      lineId: l.id,
      productName: l.product.name,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      discountPercent: Number(l.discountPercent),
      lineTotal: Number(l.lineTotal),
    })),
    total: Number(fullQuote.total),
    message,
  };
  // NOTE: marginPercent, riskScore, approvalReasoning, warehouseAllocation are intentionally ABSENT
}

