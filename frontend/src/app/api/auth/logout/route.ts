import { NextResponse } from 'next/server';
import { DEMO_ROLE_COOKIE } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    data: { message: 'Logged out successfully.' },
  });

  response.cookies.set(DEMO_ROLE_COOKIE, '', {
    path: '/',
    expires: new Date(0),
  });

  return response;
}
