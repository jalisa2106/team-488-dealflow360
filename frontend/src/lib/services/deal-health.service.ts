/**
 * Deal Health Service — runs health checks on active deals
 * Can run periodically or on-demand when someone opens the dashboard.
 */

import { prisma } from '@/lib/db/prisma';
import { runDealHealthEngine } from '@/lib/engines/deal-health.engine';

export async function computeDealHealth(quoteId: string) {
  const quote = await prisma.quote.findUniqueOrThrow({
    where: { id: quoteId },
    include: {
      quoteLines: true,
      approvalRequests: {
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
      },
      negotiations: {
        orderBy: { createdAt: 'desc' },
      },
      salesRep: true,
    },
  });

  // Signal 1: Stall — days since last update
  const now = new Date();
  const lastActivity = quote.updatedAt;
  const daysSinceLastActivity = Math.floor(
    (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Signal 2: Discount anomaly — compare vs rep's historical average
  const repAvgDiscount = await getRepAverageDiscount(quote.salesRepId);
  const quoteDiscountPercent = Number(quote.discountAmount) / (Number(quote.subtotal) || 1) * 100;

  // Signal 3: Approval delay
  let pendingApprovalAgeHours: number | null = null;
  if (quote.approvalRequests.length > 0) {
    const oldestPending = quote.approvalRequests[0];
    pendingApprovalAgeHours = (now.getTime() - oldestPending.createdAt.getTime()) / (1000 * 60 * 60);
  }

  // Signal 4: Inventory/delivery (simplified — check warehouse count from deal's risk score context)
  // We use the stored riskScore as a proxy for inventory risk for health purposes
  const warehouseCount = quote.riskScore > 15 ? 2 : 1; // infer from stored risk
  const deliveryDateSlipped = false; // would come from order delivery date tracking

  // Signal 5: Negotiation churn
  const negotiationCounterCount = quote.negotiations.length;

  const healthResult = runDealHealthEngine({
    quoteId: quote.id,
    daysSinceLastActivity,
    repAvgDiscountPercent: repAvgDiscount,
    quoteDiscountPercent,
    pendingApprovalAgeHours,
    warehouseCount,
    deliveryDateSlipped,
    negotiationCounterCount,
  });

  // Persist deal health event
  await prisma.dealHealthEvent.create({
    data: {
      quoteId: quote.id,
      score: healthResult.score,
      level: healthResult.level,
      reasons: JSON.stringify(healthResult.reasons),
    },
  });

  return healthResult;
}

export async function getDealHealthDashboard(salesRepId?: string) {
  const where = {
    status: {
      notIn: ['COMPLETED', 'CANCELLED', 'REJECTED'],
    },
    ...(salesRepId && { salesRepId }),
  };

  const quotes = await prisma.quote.findMany({
    where,
    include: {
      customer: { select: { id: true, companyName: true } },
      salesRep: { select: { id: true, name: true } },
      dealHealthEvents: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'asc' }, // stalest first
  });

  // Compute health for quotes without recent health events (older than 1 hour)
  const results = await Promise.all(
    quotes.map(async quote => {
      const latestEvent = quote.dealHealthEvents[0];
      const isStale = !latestEvent ||
        (Date.now() - latestEvent.createdAt.getTime()) > 60 * 60 * 1000;

      if (isStale) {
        const health = await computeDealHealth(quote.id);
        return { quote, health };
      }

      return {
        quote,
        health: {
          score: latestEvent.score,
          level: latestEvent.level as 'HEALTHY' | 'WATCH' | 'AT_RISK' | 'CRITICAL',
          reasons: JSON.parse(latestEvent.reasons as string),
        },
      };
    })
  );

  return results.map(r => ({
    quoteId: r.quote.id,
    quote: r.quote,
    healthLevel: r.health.level,
    healthScore: r.health.score,
    reasons: r.health.reasons,
    health: r.health,
  }));
}

async function getRepAverageDiscount(salesRepId: string): Promise<number> {
  const result = await prisma.quote.aggregate({
    where: {
      salesRepId,
      status: { notIn: ['DRAFT', 'CANCELLED'] },
    },
    _avg: { discountAmount: true, subtotal: true },
  });

  const avgDiscount = Number(result._avg.discountAmount ?? 0);
  const avgSubtotal = Number(result._avg.subtotal ?? 1);
  return avgSubtotal > 0 ? Math.round((avgDiscount / avgSubtotal) * 10000) / 100 : 0;
}
