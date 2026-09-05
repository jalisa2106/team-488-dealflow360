import { NextResponse } from 'next/server';
import { createQuote } from '@/lib/services/quote.service';

export async function GET() {
  try {
    const quote = await createQuote({
      customerId: "F82D3790-04C5-4741-86DF-CE9961505140",
      salesRepId: "E8DF3E16-D03C-491B-BA1D-CF1FF00C6FC4",
      lines: [{ productId: "5aa86ac8-9977-4cad-9be3-3314c4dd7a33", quantity: 1, discountPercent: 0 }]
    }, "E8DF3E16-D03C-491B-BA1D-CF1FF00C6FC4");
    return NextResponse.json(quote);
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
