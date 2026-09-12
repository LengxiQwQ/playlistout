/**
 * Cloudflare Worker In-Memory Rate Limiter
 * Provides bounded abuse protection against automated scraping and brute-force traffic.
 * Generous limits prevent impacting normal users while protecting free infrastructure.
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory sliding window cache (per worker isolate)
const ipStore = new Map<string, RateLimitRecord>();

// Clean up stale entries periodically to prevent unbounded memory growth
const CLEANUP_INTERVAL_MS = 60000;
let lastCleanup = Date.now();

function cleanupStaleEntries(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;

  lastCleanup = now;
  for (const [ip, record] of ipStore.entries()) {
    if (now >= record.resetTime) {
      ipStore.delete(ip);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

/**
 * Checks and increments the rate limit for a client IP.
 * @param clientIp Client IP address
 * @param maxRequests Maximum allowed requests in the time window (default: 30)
 * @param windowSeconds Duration of window in seconds (default: 60)
 */
export function checkRateLimit(
  clientIp: string,
  maxRequests: number = 30,
  windowSeconds: number = 60,
): RateLimitResult {
  cleanupStaleEntries();

  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const ip = clientIp || 'unknown';

  let record = ipStore.get(ip);

  if (!record || now >= record.resetTime) {
    record = {
      count: 1,
      resetTime: now + windowMs,
    };
    ipStore.set(ip, record);

    return {
      allowed: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      resetSeconds: windowSeconds,
    };
  }

  record.count += 1;
  const resetSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));

  if (record.count > maxRequests) {
    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      resetSeconds,
    };
  }

  return {
    allowed: true,
    limit: maxRequests,
    remaining: maxRequests - record.count,
    resetSeconds,
  };
}

/**
 * Helper to reset rate limit store in tests.
 */
export function resetRateLimitStore(): void {
  ipStore.clear();
}
