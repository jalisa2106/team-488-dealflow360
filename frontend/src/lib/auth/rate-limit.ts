/**
 * In-memory login rate limiter.
 *
 * Tracks failed auth attempts per (email + IP) composite key.
 * Limits: 5 failed attempts per 15-minute window.
 *
 * This is intentionally self-contained in src/lib/auth/ — the login route
 * should call checkRateLimit() before verifying credentials, and
 * recordFailedAttempt() only on a failed password check.
 *
 * NOTE: In-memory storage resets on server restart (fine for a demo/jury).
 * For production, back this with Redis or a DB table.
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface AttemptRecord {
  count: number;
  windowStart: number; // epoch ms
}

// Map key: `${email}:${ip}`
const attemptStore = new Map<string, AttemptRecord>();

function makeKey(email: string, ip: string): string {
  return `${email.toLowerCase()}:${ip}`;
}

function getRecord(key: string): AttemptRecord {
  const now = Date.now();
  const existing = attemptStore.get(key);

  // No record, or window has expired — start fresh
  if (!existing || now - existing.windowStart > WINDOW_MS) {
    return { count: 0, windowStart: now };
  }
  return existing;
}

/**
 * Checks if the given email+IP combination is currently rate-limited.
 * Returns `{ blocked: true, retryAfter }` (seconds) if blocked, or
 * `{ blocked: false }` if the request may proceed.
 */
export function checkRateLimit(
  email: string,
  ip: string
): { blocked: true; retryAfter: number } | { blocked: false } {
  const key = makeKey(email, ip);
  const record = getRecord(key);

  if (record.count >= MAX_ATTEMPTS) {
    const elapsed = Date.now() - record.windowStart;
    const retryAfter = Math.ceil((WINDOW_MS - elapsed) / 1000);
    return { blocked: true, retryAfter: Math.max(retryAfter, 0) };
  }

  return { blocked: false };
}

/**
 * Records a failed login attempt for the given email+IP.
 * Must be called AFTER a failed credential check (not before, to avoid
 * leaking account existence via timing on the very first attempt).
 */
export function recordFailedAttempt(email: string, ip: string): void {
  const key = makeKey(email, ip);
  const record = getRecord(key);
  record.count += 1;
  attemptStore.set(key, record);
}

/**
 * Clears the attempt counter for a given email+IP (call on successful login).
 */
export function clearAttempts(email: string, ip: string): void {
  attemptStore.delete(makeKey(email, ip));
}
