import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// GET /api/portal/quote?token=XXX — load quote for customer portal (token-authenticated)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Portal token required' }, { status: 401 });

  try {
    const quote = await prisma.quote.findUnique({
      where: { portalToken: token },
      include: {
        customer: { select: { companyName: true } },
        quoteLines: {
          include: { product: { select: { id: true, name: true } } },
        },
      },
    });

    if (!quote) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });

    // Return RESTRICTED portal response — no margin/risk/approval data
    return NextResponse.json({
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      status: quote.status,
      customer: quote.customer?.companyName,
      total: Number(quote.total),
      lines: quote.quoteLines.map(l => ({
        id: l.id,
        productId: l.productId,
        productName: l.product?.name,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        discountPercent: Number(l.discountPercent),
        lineTotal: Number(l.lineTotal),
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
