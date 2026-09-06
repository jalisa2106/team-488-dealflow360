interface RateLimitInfo {
  count: number;
  resetAt: number;
}

// In-memory store
const limits = new Map<string, RateLimitInfo>();

/**
 * Basic in-memory rate limiting.
 * @param key unique identifier (e.g. IP + email)
 * @param maxAttempts maximum allowed attempts before rate limiting
 * @param windowMs time window in milliseconds (default 15 mins)
 * @returns true if allowed, false if rate limited
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000
): boolean {
  const now = Date.now();
  const info = limits.get(key);

  if (!info) {
    limits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  // If the window has expired, reset
  if (now > info.resetAt) {
    limits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  // If within the window and under max limit, increment
  if (info.count < maxAttempts) {
    info.count += 1;
    return true;
  }

  // Rate limit exceeded
  return false;
}
