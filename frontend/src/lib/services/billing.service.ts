/**
 * Billing Service — creates invoices and subscriptions from confirmed orders
 */

import { prisma } from '@/lib/db/prisma';
import { writeAuditLog } from './audit.service';
import { runBillingEngine, calculateProration } from '@/lib/engines/billing.engine';

function generateInvoiceNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  return `INV-${ts}`;
}

export async function createOrderBilling(orderId: string, actorId: string) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      quote: {
        include: {
          quoteLines: {
            include: { subscriptionPlan: true, product: true },
          },
        },
      },
    },
  });

  const confirmationDate = order.createdAt;

  // Build billing engine input from quote lines
  const billingInput = {
    orderId,
    confirmationDate,
    lines: order.quote.quoteLines.map(line => ({
      lineId: line.id,
      billingType: line.billingType as 'ONE_TIME' | 'RECURRING',
      lineTotal: Number(line.lineTotal),
      taxAmount: 0, // tax already in lineTotal for this schema
      subscriptionPlanId: line.subscriptionPlanId ?? undefined,
      planPrice: line.subscriptionPlan ? Number(line.subscriptionPlan.price) : undefined,
      planFrequency: line.subscriptionPlan?.frequency as 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | undefined,
      quantity: Number(line.quantity),
    })),
  };

  const billingResult = runBillingEngine(billingInput);

  // Create ONE_TIME invoice
  let invoice = null;
  if (billingResult.invoice) {
    invoice = await prisma.invoice.create({
      data: {
        orderId,
        invoiceNumber: generateInvoiceNumber(),
        type: 'ONE_TIME',
        amount: billingResult.invoice.invoiceTotal,
        status: 'DRAFT',
      },
    });
  }

  // Create RECURRING subscriptions + billing schedules
  const subscriptions = [];
  for (const schedule of billingResult.subscriptionSchedules) {
    const subscription = await prisma.subscription.create({
      data: {
        quoteLineId: schedule.lineId,
        orderId,
        subscriptionPlanId: schedule.subscriptionPlanId,
        quantity: schedule.quantity,
        status: 'ACTIVE',
        startedAt: confirmationDate,
        billingSchedules: {
          create: {
            billingDate: schedule.billingDate,
            amount: schedule.amount,
            status: 'PENDING',
          },
        },
      },
    });
    subscriptions.push(subscription);
  }

  await writeAuditLog({
    entityType: 'ORDER',
    entityId: orderId,
    action: 'BILLING_CREATED',
    actorId,
    after: {
      invoiceId: invoice?.id,
      invoiceTotal: billingResult.invoice?.invoiceTotal,
      subscriptionCount: subscriptions.length,
    },
  });

  return { invoice, subscriptions, billingResult };
}

export async function recordPayment(invoiceId: string, amount: number, method: string, actorId: string) {
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });

  if (invoice.status === 'PAID') {
    throw new Error('Invoice is already paid');
  }
  if (invoice.status === 'CANCELLED') {
    throw new Error('Cannot pay a cancelled invoice');
  }

  const payment = await prisma.payment.create({
    data: {
      invoiceId,
      amount,
      method,
    },
  });

  // Check if total payments >= invoice amount → flip to PAID
  const totalPaid = await prisma.payment.aggregate({
    where: { invoiceId },
    _sum: { amount: true },
  });

  const newStatus = Number(totalPaid._sum.amount ?? 0) >= Number(invoice.amount) ? 'PAID' : 'ISSUED';

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: newStatus },
  });

  await writeAuditLog({
    entityType: 'INVOICE',
    entityId: invoiceId,
    action: 'PAYMENT_RECORDED',
    actorId,
    before: { status: invoice.status },
    after: { status: newStatus, paymentAmount: amount },
  });

  return { payment, newStatus };
}

export async function prorateSubscription(
  subscriptionId: string,
  newQuantity: number,
  changeDate: Date,
  actorId: string
) {
  const subscription = await prisma.subscription.findUniqueOrThrow({
    where: { id: subscriptionId },
    include: {
      subscriptionPlan: true,
      billingSchedules: {
        where: { status: 'PENDING' },
        orderBy: { billingDate: 'asc' },
        take: 1,
      },
    },
  });

  const oldQuantity = Number(subscription.quantity);
  const quantityDelta = newQuantity - oldQuantity;

  if (quantityDelta === 0) return null;

  // Find current period
  const nextBillingDate = subscription.billingSchedules[0]?.billingDate;
  if (!nextBillingDate) throw new Error('No pending billing schedule found');

  const planFrequency = subscription.subscriptionPlan.frequency;
  const planPrice = Number(subscription.subscriptionPlan.price);

  // Period start = startedAt or last billing date
  const periodStart = subscription.startedAt;

  const proration = calculateProration({
    planPricePerPeriod: planPrice,
    periodStartDate: periodStart,
    periodEndDate: nextBillingDate,
    changeDate,
    quantityDelta,
  });

  // Create credit note or additional invoice for proration amount
  if (Math.abs(proration.proratedAmount) > 0) {
    const latestInvoice = await prisma.invoice.findFirst({
      where: { orderId: subscription.orderId ?? '' },
      orderBy: { createdAt: 'desc' },
    });

    if (latestInvoice && proration.proratedAmount < 0) {
      // Credit
      await prisma.creditNote.create({
        data: {
          invoiceId: latestInvoice.id,
          amount: Math.abs(proration.proratedAmount),
          reason: `Proration credit for quantity change ${oldQuantity} → ${newQuantity}`,
        },
      });
    }
  }

  // Update subscription quantity
  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { quantity: newQuantity },
  });

  await writeAuditLog({
    entityType: 'INVOICE',
    entityId: subscriptionId,
    action: 'SUBSCRIPTION_PRORATED',
    actorId,
    before: { quantity: oldQuantity },
    after: { quantity: newQuantity, proratedAmount: proration.proratedAmount },
    reason: `Quantity changed from ${oldQuantity} to ${newQuantity}`,
  });

  return proration;
}
