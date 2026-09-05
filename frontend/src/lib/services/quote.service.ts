/**
 * Quote Service — orchestrates the full evaluate pipeline:
 *   Pricing → Discount → Margin → Risk → Approval
 *
 * This is the ONLY layer allowed to:
 *   - Touch the database
 *   - Call multiple engines in sequence
 *   - Persist results
 *   - Trigger side effects (audit logs, notifications)
 *
 * "The engine decides, the service orchestrates, the repository persists."
 */

import { prisma } from '@/lib/db/prisma';
import { writeAuditLog } from './audit.service';
import {
  resolvePricing,
  runDiscountEngine,
  runMarginEngine,
  runRiskEngine,
  runApprovalEngine,
  type DiscountLineInput,
  type MarginLineInput,
  type RiskLineInput,
} from '@/lib/engines';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface QuoteLineInput {
  productId: string;
  quantity: number;
  discountPercent: number;
  billingType?: 'ONE_TIME' | 'RECURRING';
  subscriptionPlanId?: string;
}

export interface CreateQuoteInput {
  customerId: string;
  salesRepId: string;
  lines: QuoteLineInput[];
}

export interface EvaluateQuoteResult {
  quoteId: string;
  pricing: {
    subtotal: number;
    discountAmount: number;
    total: number;
    taxTotal: number;
  };
  discount: {
    hasAnyOverage: boolean;
    lineResults: Array<{
      lineId: string;
      allowedPercent: number;
      overagePercent: number;
      bindingRule: string;
      inViolation: boolean;
    }>;
  };
  margin: {
    quoteMarginAmount: number;
    quoteTotalRevenue: number;
    quoteMarginPercent: number;
  };
  risk: {
    score: number;
    level: string;
    reasons: Array<{ component: string; severity: string; message: string; points: number }>;
  };
  approval: {
    approvalRequired: boolean;
    requiredRoles: string[];
    triggeredByHardViolation: boolean;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function generateQuoteNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  return `Q-${ts}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Quote (draft)
// ─────────────────────────────────────────────────────────────────────────────

export async function createQuote(input: CreateQuoteInput, actorId: string) {
  // Fetch customer + products in parallel
  const [customer, products] = await Promise.all([
    prisma.customer.findUniqueOrThrow({
      where: { id: input.customerId },
      include: { tier: true },
    }),
    prisma.product.findMany({
      where: { id: { in: input.lines.map(l => l.productId) }, active: true },
    }),
  ]);

  const productMap = new Map(products.map(p => [p.id, p]));

  // Build quote lines with server-side pricing (never trust client price)
  const lineData = input.lines.map(line => {
    const product = productMap.get(line.productId);
    if (!product) throw new Error(`Product ${line.productId} not found or inactive`);

    const pricing = resolvePricing({
      basePrice: Number(product.basePrice),
      costPrice: Number(product.costPrice),
      quantity: line.quantity,
      taxPercent: Number(product.taxPercent),
    });

    const discountAmount = Math.round((pricing.subtotal * line.discountPercent / 100) * 100) / 100;
    const lineTotal = Math.round((pricing.subtotal - discountAmount) * 100) / 100;

    return {
      productId: line.productId,
      quantity: line.quantity,
      unitPrice: pricing.unitPrice,
      discountPercent: line.discountPercent,
      discountAmount,
      lineTotal,
      marginAmount: Math.round((lineTotal - pricing.unitPrice * line.quantity * (Number(product.costPrice) / Number(product.basePrice))) * 100) / 100,
      billingType: line.billingType ?? 'ONE_TIME',
      subscriptionPlanId: line.subscriptionPlanId ?? null,
    };
  });

  const subtotal = Math.round(lineData.reduce((s, l) => s + Number(l.unitPrice) * Number(l.quantity), 0) * 100) / 100;
  const discountAmount = Math.round(lineData.reduce((s, l) => s + Number(l.discountAmount), 0) * 100) / 100;
  const total = Math.round(lineData.reduce((s, l) => s + Number(l.lineTotal), 0) * 100) / 100;

  const quote = await prisma.quote.create({
    data: {
      quoteNumber: generateQuoteNumber(),
      customerId: input.customerId,
      salesRepId: input.salesRepId,
      status: 'DRAFT',
      subtotal,
      discountAmount,
      total,
      quoteLines: {
        create: lineData,
      },
    },
    include: {
      quoteLines: { include: { product: { include: { category: true } } } },
      customer: { include: { tier: true } },
    },
  });

  await writeAuditLog({
    entityType: 'QUOTE',
    entityId: quote.id,
    action: 'QUOTE_CREATED',
    actorId,
    after: { quoteNumber: quote.quoteNumber, status: 'DRAFT', total },
  });

  return quote;
}

// ─────────────────────────────────────────────────────────────────────────────
// Evaluate Quote — runs the full pipeline
// ─────────────────────────────────────────────────────────────────────────────

export async function evaluateQuote(quoteId: string, actorId: string): Promise<EvaluateQuoteResult> {
  // Fetch everything needed in one query
  const quote = await prisma.quote.findUniqueOrThrow({
    where: { id: quoteId },
    include: {
      customer: { include: { tier: true } },
      quoteLines: {
        include: {
          product: { include: { category: true } },
        },
      },
    },
  });

  const lines = quote.quoteLines;
  const tierId = quote.customer.tierId;

  // Fetch discount rules for this customer tier + all categories on the quote
  const categoryIds = [...new Set(lines.map(l => l.product.categoryId).filter(Boolean))] as string[];
  const discountRules = await prisma.discountRule.findMany({
    where: {
      active: true,
      OR: [
        { customerTierId: tierId ?? undefined },
        { categoryId: { in: categoryIds } },
      ],
    },
  });

  // Build lookup maps for ceilings
  const tierCeilingMap = new Map<string, number>(); // categoryId → ceiling
  const catCeilingMap = new Map<string, number>();  // categoryId → ceiling

  for (const rule of discountRules) {
    if (rule.customerTierId && rule.categoryId) {
      // Tier-specific category ceiling
      tierCeilingMap.set(rule.categoryId, Number(rule.maxDiscountPercent));
    } else if (rule.customerTierId && !rule.categoryId) {
      // General tier ceiling (applies to all categories)
      for (const cid of categoryIds) {
        if (!tierCeilingMap.has(cid)) {
          tierCeilingMap.set(cid, Number(rule.maxDiscountPercent));
        }
      }
    } else if (!rule.customerTierId && rule.categoryId) {
      // Category-specific ceiling
      catCeilingMap.set(rule.categoryId, Number(rule.maxDiscountPercent));
    }
  }

  // Default ceilings if no rule found
  const DEFAULT_CEILING = 100; // no restriction

  // Run Pricing Engine (already done at create time, but verify values)
  let pricingSubtotal = 0;
  let pricingTaxTotal = 0;

  const discountInputLines: DiscountLineInput[] = [];
  const marginInputLines: MarginLineInput[] = [];
  const riskInputLines: RiskLineInput[] = [];

  for (const line of lines) {
    const product = line.product;
    const categoryId = product.categoryId ?? '';

    const pricing = resolvePricing({
      basePrice: Number(product.basePrice),
      costPrice: Number(product.costPrice),
      quantity: Number(line.quantity),
      taxPercent: Number(product.taxPercent),
    });

    pricingSubtotal += pricing.subtotal;
    pricingTaxTotal += pricing.taxAmount;

    const discountPercent = Number(line.discountPercent);
    const lineRevenue = Math.round(pricing.subtotal * (1 - discountPercent / 100) * 100) / 100;

    discountInputLines.push({
      lineId: line.id,
      categoryId,
      requestedDiscountPercent: discountPercent,
      lineRevenue,
      tierCeilingPercent: tierCeilingMap.get(categoryId) ?? DEFAULT_CEILING,
      categoryMaxPercent: catCeilingMap.get(categoryId) ?? DEFAULT_CEILING,
    });

    marginInputLines.push({
      lineId: line.id,
      unitPrice: Number(product.basePrice),
      quantity: Number(line.quantity),
      discountPercent,
      costPrice: Number(product.costPrice),
    });
  }

  // Engine 2: Discount
  const discountResult = runDiscountEngine({ lines: discountInputLines });

  // Build risk line inputs (after discount result)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const discLine = discountResult.lineResults[i];
    riskInputLines.push({
      lineId: line.id,
      lineRevenue: discountInputLines[i].lineRevenue,
      overagePercent: discLine.overagePercent,
      productName: line.product.name,
      categoryName: line.product.category?.name ?? 'Unknown',
    });
  }

  // Engine 3: Margin
  const marginResult = runMarginEngine({ lines: marginInputLines });

  // Inventory check (simplified: check aggregate stock across warehouses)
  const inventoryData = await prisma.inventory.findMany({
    where: {
      productId: { in: lines.map(l => l.productId) },
    },
  });
  
  const invByProduct = new Map<string, { total: number; warehouseCount: number }>();
  for (const inv of inventoryData) {
    const qty = Number(inv.quantityAvailable);
    if (qty <= 0) continue;
    const existing = invByProduct.get(inv.productId) ?? { total: 0, warehouseCount: 0 };
    invByProduct.set(inv.productId, {
      total: existing.total + qty,
      warehouseCount: existing.warehouseCount + 1,
    });
  }

  let maxWarehouseCount = 1;
  let allFulfillable = true;
  for (const line of lines) {
    const inv = invByProduct.get(line.productId);
    if (!inv || inv.total < Number(line.quantity)) {
      allFulfillable = false;
    }
    if (inv && inv.warehouseCount > maxWarehouseCount) {
      maxWarehouseCount = inv.warehouseCount;
    }
  }

  // Engine 4: Risk
  const riskResult = runRiskEngine({
    lines: riskInputLines,
    quoteMarginPercent: marginResult.quoteMarginPercent,
    inventory: {
      warehouseCount: maxWarehouseCount,
      fullyFulfillable: allFulfillable,
    },
  });

  // Engine 5: Approval
  const approvalResult = runApprovalEngine({
    riskLevel: riskResult.level,
    lineOverages: discountResult.lineResults.map((r, i) => ({
      lineId: r.lineId,
      overagePercent: r.overagePercent,
      productName: lines[i].product.name,
    })),
  });

  const pricingSubtotalRounded = Math.round(pricingSubtotal * 100) / 100;
  const discountAmount = Math.round(lines.reduce((s, l) => s + Number(l.discountAmount), 0) * 100) / 100;
  const total = Math.round((pricingSubtotalRounded - discountAmount) * 100) / 100;

  // Persist evaluation results back to quote
  await prisma.quote.update({
    where: { id: quoteId },
    data: {
      subtotal: pricingSubtotalRounded,
      discountAmount,
      total,
      marginAmount: marginResult.quoteMarginAmount,
      marginPercent: marginResult.quoteMarginPercent,
      riskScore: Math.round(riskResult.score),
      riskLevel: riskResult.level,
      updatedAt: new Date(),
    },
  });

  await writeAuditLog({
    entityType: 'QUOTE',
    entityId: quoteId,
    action: 'QUOTE_EVALUATED',
    actorId,
    after: {
      riskScore: riskResult.score,
      riskLevel: riskResult.level,
      marginPercent: marginResult.quoteMarginPercent,
      approvalRequired: approvalResult.approvalRequired,
    },
  });

  return {
    quoteId,
    pricing: {
      subtotal: pricingSubtotalRounded,
      discountAmount,
      total,
      taxTotal: Math.round(pricingTaxTotal * 100) / 100,
    },
    discount: {
      hasAnyOverage: discountResult.hasAnyOverage,
      lineResults: discountResult.lineResults,
    },
    margin: {
      quoteMarginAmount: marginResult.quoteMarginAmount,
      quoteTotalRevenue: marginResult.quoteTotalRevenue,
      quoteMarginPercent: marginResult.quoteMarginPercent,
    },
    risk: riskResult,
    approval: approvalResult,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Submit Quote — evaluates + creates approval requests if needed
// ─────────────────────────────────────────────────────────────────────────────

export async function submitQuote(quoteId: string, actorId: string) {
  const evalResult = await evaluateQuote(quoteId, actorId);

  // Transition quote status
  const newStatus = evalResult.approval.approvalRequired
    ? 'PENDING_APPROVAL'
    : 'APPROVED';

  await prisma.quote.update({
    where: { id: quoteId },
    data: { status: newStatus },
  });

  // Create approval request rows if needed (re-approval invariant: never mutate old ones)
  if (evalResult.approval.approvalRequired) {
    await prisma.approvalRequest.createMany({
      data: evalResult.approval.requiredRoles.map((role, idx) => ({
        quoteId,
        step: idx + 1,
        role,
        status: idx === 0 ? 'PENDING' : 'WAITING', // only first step is active
      })),
    });
  }

  await writeAuditLog({
    entityType: 'QUOTE',
    entityId: quoteId,
    action: 'QUOTE_SUBMITTED',
    actorId,
    after: {
      status: newStatus,
      approvalRequired: evalResult.approval.approvalRequired,
      requiredRoles: evalResult.approval.requiredRoles,
    },
  });

  return { ...evalResult, newStatus };
}

// ─────────────────────────────────────────────────────────────────────────────
// Get Quote with evaluation data
// ─────────────────────────────────────────────────────────────────────────────

export async function getQuote(quoteId: string) {
  return prisma.quote.findUniqueOrThrow({
    where: { id: quoteId },
    include: {
      customer: { include: { tier: true } },
      salesRep: { select: { id: true, name: true, role: true, email: true } },
      quoteLines: {
        include: {
          product: { include: { category: true } },
          subscriptionPlan: true,
        },
      },
      approvalRequests: {
        orderBy: { step: 'asc' },
        include: {
          reviewer: { select: { id: true, name: true, role: true } },
          actions: { orderBy: { createdAt: 'desc' } },
        },
      },
      negotiations: {
        orderBy: { createdAt: 'desc' },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      },
    },
  });
}

export async function listQuotes(filters: {
  salesRepId?: string;
  customerId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { salesRepId, customerId, status, page = 1, limit = 20 } = filters;

  const where = {
    ...(salesRepId && { salesRepId }),
    ...(customerId && { customerId }),
    ...(status && { status }),
  };

  const [quotes, total] = await Promise.all([
    prisma.quote.findMany({
      where,
      include: {
        customer: { select: { id: true, companyName: true, tier: { select: { name: true } } } },
        salesRep: { select: { id: true, name: true } },
        _count: { select: { quoteLines: true, approvalRequests: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.quote.count({ where }),
  ]);

  return { quotes, total, page, limit };
}
