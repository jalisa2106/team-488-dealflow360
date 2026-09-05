import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth/get-auth-session';
import { getQuote } from '@/lib/services/quote.service';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const quote = await getQuote((await params).id);
    if (session.role === 'SALES_REP' && quote.salesRepId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(quote);
  } catch {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
  }
}
