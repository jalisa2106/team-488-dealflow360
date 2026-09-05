import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/require-role';

export async function GET(req: NextRequest) {
  const result = await requireRole(req, ['ADMIN']);
  if ('response' in result) return result.response;

  return NextResponse.json({
    success: true,
    data: {
      discountThresholds: {
        repMaxDiscount: 15,
        managerMaxDiscount: 30,
        vpMaxDiscount: 50,
      },
      updatedAt: new Date().toISOString(),
    },
  });
}
