import { type NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { DEMO_ROLE_COOKIE, type UserRole } from "@/lib/auth";

const SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME || "dealflow360_session";
const DEFAULT_SECRET =
  "dealflow360-insecure-default-jwt-secret-replace-in-env-key-99881122";

// Role-based allowed path prefixes for internal vs customer domain
const ROLE_ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  "/admin": ["ADMIN"],
  "/approvals": ["ADMIN", "SALES_MANAGER", "FINANCE"],
  "/fulfillment": ["ADMIN", "OPERATIONS", "SALES_MANAGER"],
  "/invoices": ["ADMIN", "FINANCE", "SALES_MANAGER"],
  "/subscriptions": ["ADMIN", "FINANCE", "SALES_REP", "SALES_MANAGER"],
  "/reports": ["ADMIN", "SALES_MANAGER", "FINANCE", "OPERATIONS", "SALES_REP"],
  "/analytics": ["ADMIN", "SALES_MANAGER", "FINANCE", "OPERATIONS", "SALES_REP"],
  "/deal-health": ["ADMIN", "SALES_MANAGER", "SALES_REP", "FINANCE"],
  "/products": ["ADMIN", "SALES_REP", "SALES_MANAGER", "FINANCE", "OPERATIONS"],
  "/quotations": ["ADMIN", "SALES_REP", "SALES_MANAGER", "FINANCE", "OPERATIONS"],
  "/dashboard": ["ADMIN", "SALES_REP", "SALES_MANAGER", "FINANCE", "OPERATIONS"],
};

async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || DEFAULT_SECRET
    );
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

/**
 * Finds the most specific ROLE_ROUTE_PERMISSIONS prefix that matches this
 * pathname, e.g. "/quotations/123" matches "/quotations", not "/dashboard".
 * Returns null if no configured prefix applies (route is unrestricted beyond
 * plain authentication).
 */
function findRoutePermission(pathname: string): UserRole[] | null {
  const matchingPrefixes = Object.keys(ROLE_ROUTE_PERMISSIONS).filter((prefix) =>
    pathname.startsWith(prefix)
  );
  if (matchingPrefixes.length === 0) return null;

  // Prefer the longest/most specific matching prefix.
  const longest = matchingPrefixes.reduce((a, b) =>
    b.length > a.length ? b : a
  );
  return ROLE_ROUTE_PERMISSIONS[longest];
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Excluded routes from authentication checks
  const isPortalRoute = pathname.startsWith("/portal");
  const isApiPortalRoute = pathname.startsWith("/api/portal");
  const isLoginRoute = pathname.startsWith("/login");
  const isAuthApiRoute = pathname.startsWith("/api/auth");
  const isPublicAsset =
    pathname.startsWith("/_next") || pathname.includes("/favicon.ico");

  if (
    isPortalRoute ||
    isApiPortalRoute ||
    isLoginRoute ||
    isAuthApiRoute ||
    isPublicAsset
  ) {
    return NextResponse.next();
  }

  // 1. Check JWT session cookie
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;

  // 2. Check fallback demo role cookie
  const demoRole = request.cookies.get(DEMO_ROLE_COOKIE)?.value as
    | UserRole
    | undefined;

  // Not authenticated at all (no valid session, no demo role) -> login
  if (!session && !demoRole) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Resolve the effective role: real session takes priority over the demo
  // fallback cookie whenever both happen to be present.
  const effectiveRole = (session?.role as UserRole | undefined) ?? demoRole;

  // 3. Enforce role-based route permissions, if this path is restricted
  const allowedRoles = findRoutePermission(pathname);
  if (allowedRoles && (!effectiveRole || !allowedRoles.includes(effectiveRole))) {
    const forbiddenUrl = request.nextUrl.clone();
    forbiddenUrl.pathname = "/dashboard";
    forbiddenUrl.searchParams.set("error", "forbidden");
    return NextResponse.redirect(forbiddenUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};