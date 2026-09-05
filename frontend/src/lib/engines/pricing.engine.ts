/**
 * ENGINE 1 — Pricing Resolution (pure function)
 *
 * Worked examples:
 *   1. basePrice=500, costPrice=300, qty=4, taxPercent=0
 *      → subtotal=2000, taxAmount=0, lineSubtotal=2000
 *   2. basePrice=1200, costPrice=800, qty=2, taxPercent=18
 *      → subtotal=2400, taxAmount=432, lineSubtotal=2832
 *   3. basePrice=50, costPrice=30, qty=10, taxPercent=5
 *      → subtotal=500, taxAmount=25, lineSubtotal=525
 *   4. basePrice=999.99, costPrice=600, qty=1, taxPercent=0
 *      → subtotal=999.99, taxAmount=0, lineSubtotal=999.99
 *
 * Rules:
 *  - Never trust client-supplied unit price — always use server-side basePrice
 *  - Tax is displayed as a SEPARATE figure, never folded into price
 *  - For hackathon scope: flat base_price per product (no multi-tier price lists)
 */

export interface PricingInput {
  basePrice: number;      // server-side product base price
  costPrice: number;      // server-side product cost price
  quantity: number;
  taxPercent?: number;    // optional, defaults to 0
}

export interface PricingOutput {
  unitPrice: number;      // = basePrice (client can never supply this)
  subtotal: number;       // unitPrice × quantity, before discount
  taxAmount: number;      // subtotal × taxPercent / 100 (displayed separately)
  lineSubtotal: number;   // subtotal + taxAmount (before discount)
}

export function resolvePricing(input: PricingInput): PricingOutput {
  const { basePrice, quantity, taxPercent = 0 } = input;

  const unitPrice = round2(basePrice);
  const subtotal = round2(unitPrice * quantity);
  const taxAmount = round2(subtotal * (taxPercent / 100));
  const lineSubtotal = round2(subtotal + taxAmount);

  return { unitPrice, subtotal, taxAmount, lineSubtotal };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
