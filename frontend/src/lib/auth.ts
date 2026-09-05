import { User, UserRole, DEMO_USERS } from './types';

export const DEMO_ROLE_COOKIE = 'demo_role';
export const DEMO_USER_COOKIE = 'demo_user';

export function getRoleFromCookieString(cookieHeader: string | null | undefined): UserRole | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|; )\\s*${DEMO_ROLE_COOKIE}\\s*=\\s*([^;]+)`));
  if (match) {
    const roleStr = decodeURIComponent(match[1]) as UserRole;
    if (Object.keys(DEMO_USERS).includes(roleStr)) {
      return roleStr;
    }
  }
  return null;
}

export function getUserForRole(role: UserRole): User {
  return DEMO_USERS[role] || DEMO_USERS.SALES_REP;
}
