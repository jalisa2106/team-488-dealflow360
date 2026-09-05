import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/rbac';

// GET /api/price-lists
// Returns all active price lists with their items (product overrides).
// Used by the New Quotation page to populate the dropdown and resolve base prices.
export async function GET(_req: NextRequest) {
  try {
    await requireRole(['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE', 'OPERATIONS']);

    const priceLists = await prisma.priceList.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      include: {
        items: {
          select: {
            productId: true,
            price: true,
          },
        },
      },
    });

    // Serialise Decimal → string for JSON
    const serialised = priceLists.map((pl) => ({
      id: pl.id,
      name: pl.name,
      currency: pl.currency,
      items: pl.items.map((item) => ({
        productId: item.productId,
        price: item.price.toString(),
      })),
    }));

    return NextResponse.json({ success: true, data: serialised });
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    if (error.name === 'ForbiddenError')
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
    console.error('[price-lists GET]', error);
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
