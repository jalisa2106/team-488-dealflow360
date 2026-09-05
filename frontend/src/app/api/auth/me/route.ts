import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/require-role';

export async function GET(req: NextRequest) {
  const ctx = getAuthContext(req);

  if (!ctx) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No active session or role found.',
        },
      },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      user: ctx.user,
    },
  });
}
