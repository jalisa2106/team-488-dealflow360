/**
 * Negotiation Service — handles customer counter-offers from the portal
 * Runs full re-evaluation pipeline, enforces re-approval invariant, audit logs.
 */

import { prisma } from '@/lib/db/prisma';
import { writeAuditLog } from './audit.service';
import { evaluateQuote } from './quote.service';
import {
  runNegotiationDecision,
  buildPortalResponse,
  isNegotiable,
} from '@/lib/engines/negotiation.engine';
import { runApprovalEngine } from '@/lib/engines/approval.engine';
import { runDiscountEngine } from '@/lib/engines/discount.engine';
import { runRiskEngine } from '@/lib/engines/risk.engine';
import { runMarginEngine } from '@/lib/engines/margin.engine';
import { resolvePricing } from '@/lib/engines/pricing.engine';

export async function submitNegotiation(
  quoteId: string,
  portalToken: string,
  proposedTerms: Array<{ lineId: string; proposedDiscountPercent: number }>,
  message?: string
) {
  // Step 1: Verify quote is negotiable via portal token
  const quote = await prisma.quote.findUnique({
    where: { portalToken },
    include: {
      customer: { include: { tier: true } },
      quoteLines: { include: { product: { include: { category: true } } } },
      approvalRequests: { orderBy: { step: 'asc' } },
      negotiations: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!quote || quote.id !== quoteId) {
    throw new Error('Invalid portal token or quote ID');
  }

  // Guard: renegotiation is blocked once a quote is confirmed/fulfilled/completed
  // An order (and possibly invoices) already exists at this point — allowing
  // renegotiation would silently desync the Order/Invoice created for this quote.
  const POST_CONFIRMATION_STATUSES = ['CONFIRMED', 'FULFILLING', 'COMPLETED', 'CANCELLED'];
  if (POST_CONFIRMATION_STATUSES.includes(quote.status)) {
    throw new Error(
      `Renegotiation is not permitted — this quote has status "${quote.status}". ` +
      `An order has already been created. Please contact your sales representative to discuss modifications.`
    );
  }

  if (!isNegotiable(quote.status)) {
    throw new Error(`Quote status "${quote.status}" does not permit negotiation`);
  }

  // Step 2: Persist customer's proposed terms as a negotiation record
  const negotiation = await prisma.negotiation.create({
    data: {
      quoteId: quote.id,
      customerId: quote.customer.id,
      status: 'SUBMITTED',
      proposedDiscount: proposedTerms.reduce((max, t) => Math.max(max, t.proposedDiscountPercent), 0),
      message: message ?? null,
      messages: {
        create: proposedTerms.map(t => ({
          authorRole: 'CUSTOMER',
          quoteLineId: t.lineId,
          message: `Proposed discount: ${t.proposedDiscountPercent}%`,
        })),
      },
    },
  });

  // Step 3: Apply proposed terms to a fresh copy of the evaluation context
  const tierId = quote.customer.tierId;
  const categoryIds = [...new Set(quote.quoteLines.map(l => l.product.categoryId).filter(Boolean))] as string[];

  const discountRules = await prisma.discountRule.findMany({
    where: { active: true, OR: [{ customerTierId: tierId ?? undefined }, { categoryId: { in: categoryIds } }] },
  });

  const tierCeilingMap = new Map<string, number>();
  const catCeilingMap = new Map<string, number>();
  for (const rule of discountRules) {
    if (rule.customerTierId && rule.categoryId) tierCeilingMap.set(rule.categoryId, Number(rule.maxDiscountPercent));
    else if (rule.customerTierId && !rule.categoryId) for (const cid of categoryIds) { if (!tierCeilingMap.has(cid)) tierCeilingMap.set(cid, Number(rule.maxDiscountPercent)); }
    else if (!rule.customerTierId && rule.categoryId) catCeilingMap.set(rule.categoryId, Number(rule.maxDiscountPercent));
  }

  const proposedDiscountMap = new Map(proposedTerms.map(t => [t.lineId, t.proposedDiscountPercent]));

  const discountInputLines = quote.quoteLines.map(line => {
    const categoryId = line.product.categoryId ?? '';
    const pricing = resolvePricing({
      basePrice: Number(line.product.basePrice),
      costPrice: Number(line.product.costPrice),
      quantity: Number(line.quantity),
    });
    const discountPercent = proposedDiscountMap.get(line.id) ?? Number(line.discountPercent);
    const lineRevenue = Math.round(pricing.subtotal * (1 - discountPercent / 100) * 100) / 100;
    return {
      lineId: line.id,
      categoryId,
      requestedDiscountPercent: discountPercent,
      lineRevenue,
      tierCeilingPercent: tierCeilingMap.get(categoryId) ?? 100,
      categoryMaxPercent: catCeilingMap.get(categoryId) ?? 100,
    };
  });

  const discountResult = runDiscountEngine({ lines: discountInputLines });

  const marginResult = runMarginEngine({
    lines: quote.quoteLines.map(line => ({
      lineId: line.id,
      unitPrice: Number(line.product.basePrice),
      quantity: Number(line.quantity),
      discountPercent: proposedDiscountMap.get(line.id) ?? Number(line.discountPercent),
      costPrice: Number(line.product.costPrice),
    })),
  });

  const riskResult = runRiskEngine({
    lines: quote.quoteLines.map((line, i) => ({
      lineId: line.id,
      lineRevenue: discountInputLines[i].lineRevenue,
      overagePercent: discountResult.lineResults[i].overagePercent,
      productName: line.product.name,
      categoryName: line.product.category?.name ?? 'Unknown',
    })),
    quoteMarginPercent: marginResult.quoteMarginPercent,
    inventory: { warehouseCount: 1, fullyFulfillable: true }, // simplified for negotiation re-eval
  });

  const approvalResult = runApprovalEngine({
    riskLevel: riskResult.level,
    lineOverages: discountResult.lineResults.map((r, i) => ({
      lineId: r.lineId,
      overagePercent: r.overagePercent,
      productName: quote.quoteLines[i].product.name,
    })),
  });

  // Get current approved roles (for re-approval invariant comparison)
  const lastApprovedRoles = quote.approvalRequests
    .filter(r => r.status === 'APPROVED')
    .map(r => r.role as 'SALES_MANAGER' | 'FINANCE');

  // Step 4: Negotiation engine decision
  const decision = runNegotiationDecision({
    quoteId: quote.id,
    quoteStatus: quote.status,
    proposedTerms,
    currentApprovalState: { lastApprovedRoles },
    newRiskLevel: riskResult.level,
    newRiskScore: riskResult.score,
    newRequiredRoles: approvalResult.requiredRoles,
    newApprovalRequired: approvalResult.approvalRequired,
  });

  // Step 5: If new approval needed, create new approval request rows (re-approval invariant)
  if (decision.requiresNewApproval) {
    await prisma.approvalRequest.createMany({
      data: approvalResult.requiredRoles.map((role, idx) => ({
        quoteId: quote.id,
        step: idx + 1,
        role,
        status: idx === 0 ? 'PENDING' : 'WAITING',
      })),
    });
  }

  // Update quote status
  await prisma.quote.update({
    where: { id: quote.id },
    data: {
      status: decision.newQuoteStatus,
      riskScore: Math.round(riskResult.score),
      riskLevel: riskResult.level,
    },
  });

  // Step 6: Write audit log (before/after discount values)
  const beforeDiscounts = Object.fromEntries(
    quote.quoteLines.map(l => [l.id, Number(l.discountPercent)])
  );
  const afterDiscounts = Object.fromEntries(
    proposedTerms.map(t => [t.lineId, t.proposedDiscountPercent])
  );

  await writeAuditLog({
    entityType: 'QUOTE',
    entityId: quote.id,
    action: 'NEGOTIATION_COUNTER_OFFER',
    actorId: quote.customer.id, // customer is the actor
    before: { discounts: beforeDiscounts, riskLevel: quote.riskLevel },
    after: {
      discounts: afterDiscounts,
      riskLevel: riskResult.level,
      requiresNewApproval: decision.requiresNewApproval,
    },
    reason: 'Customer counter-offer',
  });

  // Build restricted portal response (no margin/risk/approval data)
  const updatedQuote = await prisma.quote.findUniqueOrThrow({
    where: { id: quote.id },
    include: {
      quoteLines: { include: { product: true } },
    },
  });

  return {
    negotiationId: negotiation.id,
    decision: {
      isNegotiable: decision.isNegotiable,
      requiresNewApproval: decision.requiresNewApproval,
      newQuoteStatus: decision.newQuoteStatus,
    },
    portalResponse: buildPortalResponse(
      {
        id: updatedQuote.id,
        quoteNumber: updatedQuote.quoteNumber,
        status: updatedQuote.status,
        total: Number(updatedQuote.total),
        quoteLines: updatedQuote.quoteLines.map(l => ({
          id: l.id,
          product: { name: l.product.name },
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          discountPercent: Number(l.discountPercent),
          lineTotal: Number(l.lineTotal),
        })),
      },
      decision.requiresNewApproval
        ? 'Your counter-offer has been received and is under internal review.'
        : 'Your counter-offer has been noted.'
    ),
  };
}
