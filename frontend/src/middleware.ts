import { type NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { DEMO_ROLE_COOKIE } from "@/lib/auth";

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "dealflow360_session";
const DEFAULT_SECRET = "dealflow360-insecure-default-jwt-secret-replace-in-env-key-99881122";

async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || DEFAULT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Excluded routes from authentication checks
  const isPortalRoute = pathname.startsWith("/portal");
  const isApiPortalRoute = pathname.startsWith("/api/portal");
  const isLoginRoute = pathname.startsWith("/login");
  const isAuthApiRoute = pathname.startsWith("/api/auth");
  const isPublicAsset = pathname.startsWith("/_next") || pathname.includes("/favicon.ico");

  if (isPortalRoute || isApiPortalRoute || isLoginRoute || isAuthApiRoute || isPublicAsset) {
    return NextResponse.next();
  }

  // 1. Check JWT session cookie
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;

  // 2. Check fallback demo role cookie
  const demoRole = request.cookies.get(DEMO_ROLE_COOKIE)?.value;

  if (!session && !demoRole) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
