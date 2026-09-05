/**
 * Session helper that extracts userId and role from the session payload.
 * SessionPayload uses `sub` for userId.
 */
import { getSession as getRawSession } from '@/lib/auth/session';

export interface SessionUser {
  userId: string;
  email: string;
  role: string;
  name?: string;
}

export async function getAuthSession(): Promise<SessionUser | null> {
  const session = await getRawSession();
  if (!session) return null;
  return {
    userId: session.sub,
    email: session.email,
    role: session.role,
    name: session.name,
  };
}
