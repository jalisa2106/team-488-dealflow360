/**
 * ENGINE 7 — Billing Engine (pure function — calculation part)
 *
 * Core split: lines are either ONE_TIME or RECURRING
 *   ONE_TIME:  sum into a single invoice for the order
 *   RECURRING: each spins up a subscription + billing schedule
 *
 * Invoice status lifecycle: DRAFT → ISSUED → PAID (CANCELLED is a side exit)
 *
 * Proration formula (for mid-cycle quantity/plan changes):
 *   daily_rate = plan_price_per_period / days_in_period
 *   prorated_amount = daily_rate × days_remaining_in_cycle × quantity_delta
 *   (only affects the current partial period; next full cycle uses new rate normally)
 *
 * Worked examples:
 *   1. ONE_TIME: lineTotal=2000, lineTotal=1500 → invoiceTotal=3500
 *   2. RECURRING: plan=Monthly $500, confirm=Jan 15, 2026 → next billing=Feb 15
 *      schedule: [Feb 15: $500, Mar 15: $500, ...]
 *   3. Proration: Monthly plan=$300/mo (30 days), change on day 10 → 20 days remaining
 *      daily_rate=$10/day, qty increase from 2→3 (delta=1)
 *      prorated_amount=$10 × 20 × 1 = $200 charge for remainder of cycle
 *   4. Payment recorded → invoice status flips from ISSUED to PAID
 *   5. Proration (decrease): same plan, qty 3→2 on day 10 → credit of $200
 */

export interface BillingLineInput {
  lineId: string;
  billingType: 'ONE_TIME' | 'RECURRING';
  lineTotal: number;         // from evaluated quote line (post-discount, post-tax)
  taxAmount?: number;
  subscriptionPlanId?: string;
  planPrice?: number;        // recurring: plan price per period
  planFrequency?: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  quantity?: number;         // for recurring subscriptions
}

export interface BillingEngineInput {
  orderId: string;
  confirmationDate: Date;
  lines: BillingLineInput[];
}

export interface InvoiceCalculation {
  oneTimeLines: BillingLineInput[];
  invoiceSubtotal: number;
  invoiceTaxTotal: number;
  invoiceTotal: number;
}

export interface SubscriptionScheduleItem {
  lineId: string;
  billingDate: Date;
  amount: number;
  subscriptionPlanId: string;
  frequency: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  quantity: number;
}

export interface BillingEngineOutput {
  invoice: InvoiceCalculation | null;           // null if no one-time lines
  subscriptionSchedules: SubscriptionScheduleItem[];  // one per recurring line
}

export function runBillingEngine(input: BillingEngineInput): BillingEngineOutput {
  const { confirmationDate, lines } = input;

  const oneTimeLines = lines.filter(l => l.billingType === 'ONE_TIME');
  const recurringLines = lines.filter(l => l.billingType === 'RECURRING');

  // ONE_TIME: single invoice
  let invoice: BillingEngineOutput['invoice'] = null;
  if (oneTimeLines.length > 0) {
    const invoiceSubtotal = round2(oneTimeLines.reduce((s, l) => s + l.lineTotal, 0));
    const invoiceTaxTotal = round2(oneTimeLines.reduce((s, l) => s + (l.taxAmount ?? 0), 0));
    invoice = {
      oneTimeLines,
      invoiceSubtotal,
      invoiceTaxTotal,
      invoiceTotal: round2(invoiceSubtotal + invoiceTaxTotal),
    };
  }

  // RECURRING: one subscription schedule per line
  const subscriptionSchedules: SubscriptionScheduleItem[] = recurringLines.map(line => {
    if (!line.subscriptionPlanId || !line.planPrice || !line.planFrequency) {
      throw new Error(`Recurring line ${line.lineId} missing plan details`);
    }
    const billingDate = nextBillingDate(confirmationDate, line.planFrequency);
    return {
      lineId: line.lineId,
      billingDate,
      amount: round2(line.planPrice * (line.quantity ?? 1)),
      subscriptionPlanId: line.subscriptionPlanId,
      frequency: line.planFrequency,
      quantity: line.quantity ?? 1,
    };
  });

  return { invoice, subscriptionSchedules };
}

/**
 * Proration calculation (pure) — returns the charge/credit amount for a mid-cycle change
 * Positive = charge (increase), Negative = credit (decrease)
 */
export interface ProrationInput {
  planPricePerPeriod: number;
  periodStartDate: Date;
  periodEndDate: Date;
  changeDate: Date;
  quantityDelta: number;        // new quantity - old quantity
}

export function calculateProration(input: ProrationInput): {
  dailyRate: number;
  daysRemaining: number;
  proratedAmount: number;
} {
  const { planPricePerPeriod, periodStartDate, periodEndDate, changeDate, quantityDelta } = input;

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysInPeriod = Math.round((periodEndDate.getTime() - periodStartDate.getTime()) / msPerDay);
  const daysRemaining = Math.max(0, Math.round((periodEndDate.getTime() - changeDate.getTime()) / msPerDay));

  const dailyRate = round2(planPricePerPeriod / daysInPeriod);
  const proratedAmount = round2(dailyRate * daysRemaining * quantityDelta);

  return { dailyRate, daysRemaining, proratedAmount };
}

function nextBillingDate(from: Date, frequency: 'MONTHLY' | 'QUARTERLY' | 'YEARLY'): Date {
  const d = new Date(from);
  switch (frequency) {
    case 'MONTHLY':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'QUARTERLY':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'YEARLY':
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
