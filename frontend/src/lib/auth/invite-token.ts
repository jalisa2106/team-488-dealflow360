import crypto from 'crypto';

/**
 * Generate a random 32-byte token and return it along with its SHA-256 hash.
 */
export function generateInviteToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = hashToken(token);
  return { token, hash };
}

/**
 * Return the SHA-256 hash of a raw token.
 */
export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
