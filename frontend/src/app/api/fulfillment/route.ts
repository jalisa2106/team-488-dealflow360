import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth/get-auth-session';
import { prisma } from '@/lib/db/prisma';

export async function GET(_req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['ADMIN', 'OPERATIONS', 'SALES_MANAGER'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Inventory per warehouse per product
    const inventory = await prisma.inventory.findMany({
      include: {
        warehouse: { select: { id: true, name: true, code: true } },
        product: { select: { id: true, name: true, sku: true } },
      },
      orderBy: [{ warehouse: { name: 'asc' } }, { product: { name: 'asc' } }],
    });

    // Orders in FULFILLING status (or CONFIRMED, awaiting allocation)
    const orders = await prisma.order.findMany({
      where: { status: { in: ['CONFIRMED', 'FULFILLING', 'PARTIALLY_FULFILLED'] } },
      include: {
        quote: {
          include: {
            customer: { select: { companyName: true } },
            quoteLines: { include: { product: { select: { name: true } } } },
          },
        },
        fulfillmentAllocations: {
          include: {
            warehouse: { select: { name: true } },
            product: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ inventory, orders });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
