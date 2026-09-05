import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { writeAuditLog } from '@/lib/services/audit.service';

// POST /api/portal/quotes/[token]/confirm
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const token = (await params).token;

    const quote = await prisma.quote.findUnique({
      where: { portalToken: token },
      include: {
        quoteLines: { include: { product: true } }
      }
    });

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found or invalid token' }, { status: 404 });
    }

    if (quote.status !== 'APPROVED' && quote.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Only APPROVED quotes can be confirmed.' }, { status: 400 });
    }

    // Update status to CONFIRMED
    const updated = await prisma.quote.update({
      where: { id: quote.id },
      data: { status: 'CONFIRMED' }
    });

    await writeAuditLog({
      entityType: 'QUOTE',
      entityId: quote.id,
      action: 'QUOTE_CONFIRMED_PORTAL',
      actorId: quote.customerId, // Using customerId as actor
      after: { status: 'CONFIRMED' },
    });

    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Confirmation failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
