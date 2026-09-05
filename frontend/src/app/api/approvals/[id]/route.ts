import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth/get-auth-session';
import { actionApprovalRequest, getApprovalRequest } from '@/lib/services/approval.service';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const approval = await getApprovalRequest(params.id);
    if (!['ADMIN', 'SALES_MANAGER', 'FINANCE'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(approval);
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['ADMIN', 'SALES_MANAGER', 'FINANCE'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = await req.json() as { action: string; reason?: string };
    const { action, reason } = body;
    if (!['APPROVE', 'REJECT', 'REQUEST_REVISION'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    const result = await actionApprovalRequest(params.id, session.userId, action as 'APPROVE' | 'REJECT' | 'REQUEST_REVISION', reason);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Action failed' }, { status: 400 });
  }
}
