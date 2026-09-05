import { NextRequest, NextResponse } from 'next/server';
import { submitNegotiation } from '@/lib/services/negotiation.service';

// POST /api/quotes/[id]/negotiate — customer counter-offer from portal
// Note: authenticated by portal token, NOT by session cookie
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json();
    const { portalToken, proposedTerms, message } = body;

    if (!portalToken) {
      return NextResponse.json({ error: 'Portal token required' }, { status: 401 });
    }

    if (!proposedTerms?.length) {
      return NextResponse.json({ error: 'proposedTerms are required' }, { status: 400 });
    }

    const result = await submitNegotiation((await params).id, portalToken, proposedTerms, message);

    // Return RESTRICTED portal response — no margin/risk/approval internals
    return NextResponse.json({
      negotiationId: result.negotiationId,
      status: result.decision.newQuoteStatus,
      message: result.decision.requiresNewApproval
        ? 'Your counter-offer has been received and is under internal review.'
        : 'Your counter-offer has been noted.',
      quote: result.portalResponse,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Negotiation failed';
    const status = message.includes('not permit negotiation') ? 422 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
