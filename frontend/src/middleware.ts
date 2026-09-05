import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getRoleFromCookieString } from '@/lib/auth';
import { UserRole } from '@/lib/types';

// Role-based allowed path prefixes for internal vs customer domain
const ROLE_ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  '/admin': ['ADMIN'],
  '/approvals': ['ADMIN', 'SALES_MANAGER', 'FINANCE'],
  '/fulfillment': ['ADMIN', 'OPERATIONS', 'SALES_MANAGER'],
  '/invoices': ['ADMIN', 'FINANCE', 'SALES_MANAGER'],
  '/subscriptions': ['ADMIN', 'FINANCE', 'SALES_REP', 'SALES_MANAGER'],
  '/reports': ['ADMIN', 'SALES_MANAGER', 'FINANCE', 'OPERATIONS', 'SALES_REP'],
  '/analytics': ['ADMIN', 'SALES_MANAGER', 'FINANCE', 'OPERATIONS', 'SALES_REP'],
  '/deal-health': ['ADMIN', 'SALES_MANAGER', 'SALES_REP', 'FINANCE'],
  '/products': ['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE', 'OPERATIONS'],
  '/quotations': ['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE', 'OPERATIONS'],
  '/dashboard': ['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE', 'OPERATIONS'],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookieHeader = request.headers.get('cookie');
  const role = getRoleFromCookieString(cookieHeader);

  // 1. Skip static assets, favicon, _next
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next();
  }

  // 2. Allow API routes to be handled by controller layer (with require-role.ts) or auth endpoints
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // 3. Login page check
  if (pathname === '/login') {
    return NextResponse.next();
  }

  // 4. Unauthenticated users trying to access protected routes -> redirect to /login
  if (!role) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  // 5. Customer domain routes (/portal)
  if (pathname.startsWith('/portal')) {
    // Customers and internal roles (for oversight) can access portal
    return NextResponse.next();
  }

  // 6. Customer role attempting to access internal dashboard routes -> redirect to customer portal
  if (role === 'CUSTOMER') {
    const url = request.nextUrl.clone();
    url.pathname = '/portal/quotation';
    return NextResponse.redirect(url);
  }

  // 7. Check internal route permissions based on profiles.role
  for (const [routePrefix, allowedRoles] of Object.entries(ROLE_ROUTE_PERMISSIONS)) {
    if (pathname === routePrefix || pathname.startsWith(routePrefix + '/')) {
      if (!allowedRoles.includes(role)) {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        url.searchParams.set('error', 'unauthorized');
        url.searchParams.set('role', role);
        return NextResponse.redirect(url);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
