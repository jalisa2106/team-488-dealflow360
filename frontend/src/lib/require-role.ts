import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from './types';
import { getRoleFromCookieString, getUserForRole } from './auth';

export interface AuthContext {
  role: UserRole;
  user: ReturnType<typeof getUserForRole>;
}

export function getAuthContext(req: NextRequest): AuthContext | null {
  const cookieHeader = req.headers.get('cookie');
  const role = getRoleFromCookieString(cookieHeader);
  if (!role) return null;
  return {
    role,
    user: getUserForRole(role),
  };
}

export function requireRole(
  req: NextRequest,
  allowedRoles: UserRole[]
): { ctx: AuthContext } | { response: NextResponse } {
  const ctx = getAuthContext(req);

  if (!ctx) {
    return {
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required. Please log in or select a demo role.',
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
            code: 'FORBIDDEN',
            message: `Access denied. Role '${ctx.role}' is not authorized for this resource. Required roles: ${allowedRoles.join(', ')}.`,
          },
        },
        { status: 403 }
      ),
    };
  }

  return { ctx };
}
