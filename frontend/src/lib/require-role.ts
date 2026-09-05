import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "./types";
import { verifySession } from "./auth/jwt";

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "dealflow360_session";

export interface AuthContext {
  role: UserRole;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    active: boolean;
    createdAt: string;
  };
  userId: string;
}

export async function getAuthContext(req: NextRequest): Promise<AuthContext | null> {
  const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) return null;

  const session = await verifySession(sessionToken);
  if (!session || !session.sub) return null;

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
            message: "Authentication required. Please log in.",
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
