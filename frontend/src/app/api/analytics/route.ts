import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth/get-auth-session';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['ADMIN', 'SALES_MANAGER', 'FINANCE'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const [
      totalQuotes,
      quotesByStatus,
      approvalStats,
      topCustomers,
      revenueByProduct,
    ] = await Promise.all([
      // Total quotes and revenue
      prisma.quote.aggregate({
        _count: { id: true },
        _sum: { total: true },
        _avg: { total: true },
      }),

      // Quotes grouped by status
      prisma.quote.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { total: true },
      }),

      // Approval stats
      prisma.approvalRequest.groupBy({
        by: ['status'],
        _count: { id: true },
      }),

      // Top customers by revenue
      prisma.quote.groupBy({
        by: ['customerId'],
        _sum: { total: true },
        _count: { id: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
        where: { status: { in: ['APPROVED', 'CONFIRMED', 'COMPLETED', 'FULFILLING'] } },
      }).then(async (rows) => {
        const ids = rows.map(r => r.customerId);
        const customers = await prisma.customer.findMany({
          where: { id: { in: ids } },
          select: { id: true, companyName: true },
        });
        const map = new Map(customers.map(c => [c.id, c.companyName]));
        return rows.map(r => ({
          companyName: map.get(r.customerId) || 'Unknown',
          revenue: Number(r._sum.total || 0),
          quoteCount: r._count.id,
        }));
      }),

      // Revenue by product category
      prisma.quoteLine.groupBy({
        by: ['productId'],
        _sum: { lineTotal: true },
        _count: { id: true },
        orderBy: { _sum: { lineTotal: 'desc' } },
        take: 8,
      }).then(async (rows) => {
        const ids = rows.map(r => r.productId);
        const products = await prisma.product.findMany({
          where: { id: { in: ids } },
          include: { category: { select: { name: true } } },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const map = new Map<string, any>(products.map(p => [p.id, p]));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return rows.map((r: any) => {
          const p = map.get(r.productId);
          return {
            productName: p?.name || 'Unknown',
            category: p?.category?.name || 'Unknown',
            revenue: Number(r._sum.lineTotal || 0),
            lineCount: r._count.id,
          };
        });
      }),
    ]);

    return NextResponse.json({
      totalQuotes: totalQuotes._count.id,
      totalRevenue: Number(totalQuotes._sum.total || 0),
      avgDealSize: Number(totalQuotes._avg.total || 0),
      quotesByStatus,
      approvalStats,
      topCustomers,
      revenueByProduct,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
