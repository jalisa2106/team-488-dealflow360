import { NextRequest, NextResponse } from 'next/server';
import { UserRole, DEMO_USERS } from '@/lib/types';
import { DEMO_ROLE_COOKIE } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const role = body.role as UserRole;

    if (!role || !DEMO_USERS[role]) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ROLE', message: 'Unknown role specified.' } },
        { status: 400 }
      );
    }

    const user = DEMO_USERS[role];
    const redirectUrl = role === 'CUSTOMER' ? '/portal/quotation' : '/dashboard';

    const response = NextResponse.json({
      success: true,
      data: {
        user,
        redirectUrl,
      },
    });

    // Set demo_role cookie
    response.cookies.set(DEMO_ROLE_COOKIE, role, {
      path: '/',
      httpOnly: false, // Accessible by client JS and middleware
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid request body' } },
      { status: 400 }
    );
  }
}
