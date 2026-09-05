/**
 * reset.ts — Truncates all transactional tables so the DB can be
 * re-seeded to a clean, deterministic demo state.
 *
 * Usage:
 *   npx tsx prisma/reset.ts          # truncate only
 *   npx tsx prisma/reset.ts --seed   # truncate then immediately re-seed
 *
 * Tables left untouched (reference / config data):
 *   CustomerTier, ProductCategory, Product, DiscountRule, ApprovalRule,
 *   Warehouse, Inventory, SubscriptionPlan, ProductCoPurchase, UpsellRule,
 *   PriceList, PriceListItem, User
 *
 * Tables cleared (transactional):
 *   AuditLog, Notification, Alert, DealHealthEvent,
 *   ApprovalAction, ApprovalRequest,
 *   NegotiationMessage, Negotiation,
 *   QuoteLine, Quote,
 *   FulfillmentAllocation, Order,
 *   BillingSchedule, Subscription,
 *   CreditNote, Payment, Invoice
 */

import { PrismaClient } from '@prisma/client';
import { execSync }     from 'child_process';

const prisma = new PrismaClient();

async function resetTransactionalData() {
  console.log('🗑️  Resetting transactional data…');

  // Delete in dependency order (children before parents)
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.dealHealthEvent.deleteMany();

  // Approval chains
  await prisma.approvalAction.deleteMany();
  await prisma.approvalRequest.deleteMany();

  // Negotiation threads
  await prisma.negotiationMessage.deleteMany();
  await prisma.negotiation.deleteMany();

  // Quotes (lines first, then quotes)
  await prisma.quoteLine.deleteMany();
  await prisma.quote.deleteMany();

  // Fulfilment
  await prisma.fulfillmentAllocation.deleteMany();
  await prisma.order.deleteMany();

  // Billing
  await prisma.billingSchedule.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.creditNote.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();

  console.log('✅  Transactional tables cleared.');
}

async function main() {
  await resetTransactionalData();

  const shouldSeed = process.argv.includes('--seed');
  if (shouldSeed) {
    console.log('\n📦  Running seed…');
    execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });
  } else {
    console.log('\nTip: run with --seed to immediately re-seed after reset.');
    console.log('     npm run db:reset-seed');
  }
}

main()
  .catch((e) => {
    console.error('Reset failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
