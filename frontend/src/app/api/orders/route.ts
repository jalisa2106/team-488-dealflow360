import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth/get-auth-session';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  if (!['ADMIN', 'OPERATIONS', 'SALES_MANAGER', 'SALES_REP', 'FINANCE'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const warehouseId = searchParams.get('warehouseId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }
    if (warehouseId) {
      whereClause.fulfillmentAllocations = {
        some: {
          warehouseId,
        },
      };
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        skip,
        take: limit,
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
      }),
      prisma.order.count({ where: whereClause })
    ]);

    // Also fetch warehouses to populate the filter dropdown on the client
    const warehouses = await prisma.warehouse.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ 
      success: true, 
      data: orders, 
      meta: { total, page, limit },
      warehouses 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch orders' }, { status: 500 });
  }
}
