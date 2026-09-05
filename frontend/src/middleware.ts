import { type NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { type UserRole } from "@/lib/types";
import { getRequiredRolesForPath } from "@/lib/auth/rbac";

const SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME || "dealflow360_session";
// DEFAULT_SECRET removed — JWT_SECRET must be set in environment variables.
// See src/lib/auth/jwt.ts which throws at startup if JWT_SECRET is missing.

/**
 * Centralized Public and Protected Route Lists
 */
export const publicRoutes = [
  "/login",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/debug",
  "/api/quotes",
  "/onboard",
  "/api/onboard",
];

export const protectedRoutes = [
  "/dashboard",
  "/products",
  "/quotations",
  "/approvals",
  "/fulfillment",
  "/subscriptions",
  "/invoices",
  "/deal-health",
  "/reports",
  "/analytics",
  "/admin",
  "/portal",
  "/orders",
];

async function verifyToken(token: string) {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) return null; // Fail safe — signing is already blocked in jwt.ts
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow static assets and Next.js internal files immediately
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.match(/\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // 2. Verify active JWT session cookie
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  const isAuthenticated = !!(session && session.sub);
  const userRole = session?.role as UserRole | undefined;

  // 3. Handle public routes
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isPublicRoute) {
    // If authenticated user visits /login, redirect to /dashboard (or portal if customer)
    if (isAuthenticated && pathname.startsWith("/login")) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname =
        userRole === "CUSTOMER" ? "/portal/quotation" : "/dashboard";
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.next();
  }

  // 4. Default ALL unknown and non-public routes to protected
  if (!isAuthenticated) {
    // If an API request is unauthenticated, return 401 Unauthorized JSON instead of HTML redirect
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        },
        { status: 401 }
      );
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 5. Customer domain checks
  if (
    userRole === "CUSTOMER" &&
    !pathname.startsWith("/portal") &&
    !pathname.startsWith("/api")
  ) {
    const portalUrl = request.nextUrl.clone();
    portalUrl.pathname = "/portal/quotation";
    return NextResponse.redirect(portalUrl);
  }

  // 6. RBAC Role checking for protected routes
  const allowedRoles = getRequiredRolesForPath(pathname);
  if (allowedRoles && (!userRole || !allowedRoles.includes(userRole))) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: `Access denied for role '${userRole}'`,
          },
        },
        { status: 403 }
      );
    }

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