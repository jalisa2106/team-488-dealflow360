import { getSession } from "./session";
import { type SessionPayload } from "./jwt";

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
export async function requireRole(allowedRoles: string[]): Promise<SessionPayload> {
  const session = await requireAuth();
  if (!allowedRoles.includes(session.role)) {
    throw new ForbiddenError(`Role ${session.role} not permitted`);
  }
  return session;
}
