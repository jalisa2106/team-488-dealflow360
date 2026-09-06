import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth/get-auth-session';
import { prisma } from '@/lib/db/prisma';
import { writeAuditLog } from '@/lib/services/audit.service';
import { allocateOrder } from '@/lib/services/fulfillment.service';
import { createOrderBilling } from '@/lib/services/billing.service';

// POST /api/quotes/[id]/confirm
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const quoteId = (await params).id;

    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        quoteLines: { include: { product: true } }
      }
    });

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    if (quote.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Only APPROVED quotes can be confirmed.' }, { status: 400 });
    }

    // Update status to CONFIRMED and create Order
    const [updatedQuote, order] = await prisma.$transaction([
      prisma.quote.update({
        where: { id: quote.id },
        data: { status: 'CONFIRMED' }
      }),
      prisma.order.create({
        data: {
          quoteId: quote.id,
          orderNumber: `ORD-${Date.now().toString(36).toUpperCase()}`,
          status: 'CONFIRMED',
        }
      })
    ]);

    await writeAuditLog({
      entityType: 'QUOTE',
      entityId: quote.id,
      action: 'QUOTE_CONFIRMED_INTERNAL',
      actorId: session.userId,
      after: { status: 'CONFIRMED', orderId: order.id },
    });

    // Auto-trigger fulfillment allocation for each product line
    for (const line of quote.quoteLines) {
      try {
        await allocateOrder(
          order.id,
          line.productId,
          Number(line.quantity),
          session.userId
        );
      } catch (err) {
        console.error(`Failed to allocate line ${line.id}:`, err);
      }
    }

    // Auto-trigger billing (invoices and subscriptions)
    try {
      await createOrderBilling(order.id, session.userId);
    } catch (err) {
      console.error(`Failed to create billing for order ${order.id}:`, err);
    }

    return NextResponse.json(updatedQuote);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Confirmation failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
