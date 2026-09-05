import crypto from "crypto";

const DEFAULT_EXPIRY_DAYS = 7;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Generates a cryptographically secure raw invite token (64 hex chars).
 * The raw token goes into the link; only its hash is stored in the DB.
 */
export function generateRawToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * SHA-256 hashes a raw token for safe storage.
 * If a DB dump leaks, the links remain unusable.
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Builds the shareable invite URL from a raw token.
 */
export function buildInviteUrl(rawToken: string): string {
  return `${APP_URL}/onboard/${rawToken}`;
}

/**
 * Returns a Date that is `days` days from now.
 */
export function getExpiryDate(days = DEFAULT_EXPIRY_DAYS): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}
