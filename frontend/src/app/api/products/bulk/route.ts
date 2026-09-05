import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth/get-auth-session';
import { prisma } from '@/lib/db/prisma';

export async function PATCH(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  if (!['ADMIN', 'OPERATIONS'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { ids, active } = await req.json();

    if (!Array.isArray(ids) || typeof active !== 'boolean') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (ids.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const result = await prisma.product.updateMany({
      where: {
        id: {
          in: ids,
        },
      },
      data: {
        active,
      },
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Update failed' }, { status: 500 });
  }
}
