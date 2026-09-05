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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['ADMIN', 'SALES_REP', 'SALES_MANAGER'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { lines } = body;
    const { updateQuote } = await import('@/lib/services/quote.service');

    if (!lines?.length) {
      return NextResponse.json({ error: 'lines is required' }, { status: 400 });
    }

    const quoteId = (await params).id;
    const updatedQuote = await updateQuote(quoteId, lines, session.userId);

    return NextResponse.json(updatedQuote);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update quote';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
