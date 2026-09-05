import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth/get-auth-session';
import { createQuote, listQuotes } from '@/lib/services/quote.service';

// GET /api/quotes — list quotes (filtered by role)
export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = parseInt(searchParams.get('limit') ?? '20');
  // Accept either a single status or comma-separated list: ?status=DRAFT,PENDING_APPROVAL
  const rawStatus = searchParams.get('status') ?? undefined;
  const status = rawStatus ? rawStatus.split(',').map(s => s.trim()).filter(Boolean) : undefined;
  const customerId = searchParams.get('customerId') ?? undefined;
  const search = searchParams.get('search') ?? undefined;

  // Sales reps only see their own quotes (unless admin/manager)
  const salesRepId = ['ADMIN', 'SALES_MANAGER', 'FINANCE', 'OPERATIONS'].includes(session.role)
    ? (searchParams.get('salesRepId') ?? undefined)
    : session.userId;

  const result = await listQuotes({ salesRepId, customerId, status, search, page, limit });
  return NextResponse.json(result);
}

// POST /api/quotes — create a new quote
export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!['ADMIN', 'SALES_REP', 'SALES_MANAGER'].includes(session.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { customerId, lines } = body;

    if (!customerId || !lines?.length) {
      return NextResponse.json({ error: 'customerId and lines are required' }, { status: 400 });
    }

    const quote = await createQuote(
      {
        customerId,
        salesRepId: (body.salesRepId as string | undefined) ?? session.userId,
        lines,
      },
      session.userId
    );

    return NextResponse.json(quote, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create quote';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
