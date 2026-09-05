import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "./types";
import { getRoleFromCookieString, getUserForRole } from "./auth";
import { verifySession } from "./auth/jwt";

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "dealflow360_session";

export interface AuthContext {
  role: UserRole;
  user: ReturnType<typeof getUserForRole>;
  userId?: string;
}

export async function getAuthContext(req: NextRequest): Promise<AuthContext | null> {
  // 1. Try JWT session cookie first
  const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (sessionToken) {
    const session = await verifySession(sessionToken);
    if (session && session.sub) {
      return {
        role: session.role as UserRole,
        user: {
          id: session.sub,
          email: session.email,
          name: session.name || "User",
          role: session.role as UserRole,
          active: true,
          createdAt: new Date().toISOString(),
        },
        userId: session.sub,
      };
    }
  }

  // 2. Fallback to demo role cookie
  const cookieHeader = req.headers.get("cookie");
  const role = getRoleFromCookieString(cookieHeader);
  if (!role) return null;

  return {
    role,
    user: getUserForRole(role),
    userId: getUserForRole(role).id,
  };
}

export async function requireRole(
  req: NextRequest,
  allowedRoles: UserRole[]
): Promise<{ ctx: AuthContext } | { response: NextResponse }> {
  const ctx = await getAuthContext(req);

  if (!ctx) {
    return {
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required. Please log in or select a demo role.",
          },
        },
        { status: 401 }
      ),
    };
  }

  if (!allowedRoles.includes(ctx.role)) {
    return {
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: `Access denied. Role '${ctx.role}' is not authorized for this resource. Required roles: ${allowedRoles.join(", ")}.`,
          },
        },
        { status: 403 }
      ),
    };
  }

  return { ctx };
}
