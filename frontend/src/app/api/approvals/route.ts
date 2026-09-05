import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/require-role';

export async function GET(req: NextRequest) {
  const result = await requireRole(req, ['ADMIN', 'SALES_MANAGER', 'FINANCE']);
  if ('response' in result) return result.response;

  return NextResponse.json({
    success: true,
    data: {
      pendingApprovalsCount: 4,
      approvals: [
        { id: 'app_101', quoteId: 'Q-2026-004', requestedBy: 'Sarah Rep', amount: 145000, discountPct: 22, status: 'PENDING' },
        { id: 'app_102', quoteId: 'Q-2026-009', requestedBy: 'John Rep', amount: 89000, discountPct: 18, status: 'PENDING' }
      ]
    }
  });
}
