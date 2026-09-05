import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth/get-auth-session';
import { getDealHealthDashboard, computeDealHealth } from '@/lib/services/deal-health.service';

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const salesRepId = session.role === 'SALES_REP'
    ? session.userId
    : (searchParams.get('salesRepId') ?? undefined);
  try {
    const results = await getDealHealthDashboard(salesRepId);
    return NextResponse.json({ results, total: results.length });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json() as { quoteId?: string };
    if (!body.quoteId) return NextResponse.json({ error: 'quoteId required' }, { status: 400 });
    const result = await computeDealHealth(body.quoteId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 400 });
  }
}
