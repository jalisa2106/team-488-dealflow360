import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth/get-auth-session';
import { createOrderBilling, recordPayment } from '@/lib/services/billing.service';

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['ADMIN', 'FINANCE', 'OPERATIONS'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = await req.json() as { action: string; orderId?: string; invoiceId?: string; amount?: number; method?: string };
    const { action, orderId, invoiceId, amount, method } = body;

    if (action === 'create_billing') {
      if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });
      const result = await createOrderBilling(orderId, session.userId);
      return NextResponse.json(result, { status: 201 });
    }
    if (action === 'record_payment') {
      if (!invoiceId || amount == null || !method) {
        return NextResponse.json({ error: 'invoiceId, amount, method required' }, { status: 400 });
      }
      const result = await recordPayment(invoiceId, amount, method, session.userId);
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 400 });
  }
}
