import { getSession } from "./session";
import { type SessionPayload } from "./jwt";
import { UserRole } from "../types";

export class UnauthorizedError extends Error {
  status = 401;
  constructor(message = "Not authenticated") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Centralized Route Role Mapping
 */
export const ROUTE_ROLE_MAP: Record<string, UserRole[]> = {
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
  "/portal": ["CUSTOMER", "ADMIN"],
};

export const API_ROUTE_ROLE_MAP: Record<string, UserRole[]> = {
  "/api/admin": ["ADMIN"],
  "/api/approvals": ["ADMIN", "SALES_MANAGER", "FINANCE"],
  "/api/products": ["ADMIN", "SALES_REP", "SALES_MANAGER", "FINANCE", "OPERATIONS"],
  "/api/customers": ["ADMIN", "SALES_REP", "SALES_MANAGER", "FINANCE", "OPERATIONS"],
};

/**
 * Resolves required roles for a given pathname pattern.
 */
export function getRequiredRolesForPath(pathname: string): UserRole[] | null {
  const matchingPrefixes = Object.keys(ROUTE_ROLE_MAP).filter((prefix) =>
    pathname.startsWith(prefix)
  );
  if (matchingPrefixes.length === 0) return null;

  const longest = matchingPrefixes.reduce((a, b) => (b.length > a.length ? b : a));
  return ROUTE_ROLE_MAP[longest];
}

export function getRequiredRolesForApiRoute(pathname: string): UserRole[] | null {
  const matchingPrefixes = Object.keys(API_ROUTE_ROLE_MAP).filter((prefix) =>
    pathname.startsWith(prefix)
  );
  if (matchingPrefixes.length === 0) return null;

  const longest = matchingPrefixes.reduce((a, b) => (b.length > a.length ? b : a));
  return API_ROUTE_ROLE_MAP[longest];
}

/**
 * Requires a valid active session. Throws UnauthorizedError(401) if not logged in.
 */
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session || !session.sub) {
    throw new UnauthorizedError("Not authenticated");
  }
  return session;
}

/**
 * Requires an active session with one of the allowed roles.
 * Throws UnauthorizedError(401) if not logged in, or ForbiddenError(403) if role is insufficient.
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<SessionPayload> {
  const session = await requireAuth();
  const role = session.role as UserRole;
  if (!allowedRoles.includes(role)) {
    throw new ForbiddenError(`Role '${role}' is not permitted for this operation.`);
  }
  return session;
}
