import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth/get-auth-session';
import { allocateOrder } from '@/lib/services/fulfillment.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['ADMIN', 'OPERATIONS'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden. Operations role required.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { productId, requestedQuantity, manualOverride, overrideReason } = body;

    if (!productId || !requestedQuantity || !manualOverride) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const orderId = (await params).id;
    const allocation = await allocateOrder(
      orderId,
      productId,
      requestedQuantity,
      session.userId,
      manualOverride,
      overrideReason
    );

    return NextResponse.json(allocation);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Override failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
