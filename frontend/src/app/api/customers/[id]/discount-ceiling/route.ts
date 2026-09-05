import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/rbac';

// GET /api/customers/[id]/discount-ceiling
// Returns the active DiscountRule.maxDiscountPercent for the customer's tier.
// Falls back to 100 (no ceiling) when no rule is found.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE', 'OPERATIONS']);

    const { id } = await params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { tierId: true },
    });

    if (!customer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }

    // Find the most-restrictive (lowest) active rule for this tier
    // A null tierId on the rule means it applies to all tiers
    const rule = await prisma.discountRule.findFirst({
      where: {
        active: true,
        OR: [
          { customerTierId: customer.tierId ?? undefined },
          { customerTierId: null },
        ],
      },
      orderBy: [
        // tier-specific rules take priority over global ones
        { customerTierId: 'asc' },
        // highest priority number wins
        { priority: 'desc' },
      ],
    });

    return NextResponse.json({
      success: true,
      data: {
        maxDiscountPercent: rule ? Number(rule.maxDiscountPercent) : 100,
        tierId: customer.tierId,
      },
    });
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    if (error.name === 'ForbiddenError')
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
    console.error('[discount-ceiling GET]', error);
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
