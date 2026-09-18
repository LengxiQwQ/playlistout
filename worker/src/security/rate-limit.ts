/**
 * Cloudflare Worker Multi-tier Rate Limiter
 * Provides bounded abuse protection against automated scraping, event floods, and brute-force traffic.
 *
 * Tier 1: In-memory sliding window cache (fast local burst guard per worker isolate)
 * Tier 2: D1-backed durable rate bucket (cross-isolate authoritative abuse control for POST /api/event)
 *
 * PRIVACY GUARANTEE:
 * - No raw IP addresses are ever stored in D1.
 * - Rate limit keys are salted one-way SHA-256 hashes with short lifespans.
 * - Ephemeral security state only; never exposed to public stats or insights.
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
  limiterFailed?: boolean;
}

const RATE_LIMIT_SALT = 'playlistout_rl_salt_2026';

/**
 * Extracts client IP using server-derived headers.
 * In Cloudflare production edge, cf-connecting-ip is trusted and unforgeable by the client.
 * X-Forwarded-For is strictly ignored for event security identity to prevent spoofing.
 */
export function getClientIp(request: Request): string {
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp.trim();
  }
  // Local development / automated test fallback only
  return '127.0.0.1';
}

/**
 * Computes a privacy-preserving, one-way SHA-256 hashed rate limit key for D1 storage.
 * Zero raw IP information is stored in D1.
 */
export async function hashRateLimitKey(
  scope: string,
  windowBucket: number,
  clientIp: string,
): Promise<string> {
  const raw = `${scope}:${windowBucket}:${clientIp}:${RATE_LIMIT_SALT}`;
  const data = new TextEncoder().encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `rl_${scope}_${hex.slice(0, 24)}`;
}

/**
 * Checks and increments the in-memory rate limit for a client IP and endpoint scope (Tier 1).
 * @param clientIp Client IP address
 * @param maxRequests Maximum allowed requests in the time window (default: 30)
 * @param windowSeconds Duration of window in seconds (default: 60)
 * @param scope Rate limit scope/endpoint to isolate limits (default: 'default')
 */
export function checkRateLimit(
  clientIp: string,
  maxRequests: number = 30,
  windowSeconds: number = 60,
  scope: string = 'default',
): RateLimitResult {
  cleanupStaleEntries();

  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const ip = clientIp || 'unknown';
  const key = `${scope}:${ip}`;

  let record = ipStore.get(key);

  if (!record || now >= record.resetTime) {
    record = {
      count: 1,
      resetTime: now + windowMs,
    };
    ipStore.set(key, record);

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
 * Checks durable abuse control across multiple Worker isolates using D1 (Tier 2).
 * Privacy: Client IP is never stored directly — only an ephemeral salted hash.
 * If D1 fails, fails closed for telemetry writes (limiterFailed = true) to protect D1.
 */
export async function checkDurableRateLimit(
  db: D1Database | undefined,
  clientIp: string,
  maxRequests: number = 60,
  windowSeconds: number = 60,
  scope: string = 'event',
): Promise<RateLimitResult> {
  // 1. In-memory fast burst guard (Tier 1)
  const localCheck = checkRateLimit(clientIp, maxRequests, windowSeconds, scope);
  if (!localCheck.allowed) {
    return localCheck;
  }

  if (!db) {
    return localCheck;
  }

  // 2. Authoritative cross-isolate check in D1 (Tier 2)
  try {
    const nowSec = Math.floor(Date.now() / 1000);
    const windowBucket = Math.floor(nowSec / windowSeconds);
    const resetAt = (windowBucket + 1) * windowSeconds;
    const key = await hashRateLimitKey(scope, windowBucket, clientIp);

    const upsertSql = `
      INSERT INTO security_rate_limits (key, count, reset_at)
      VALUES (?1, 1, ?2)
      ON CONFLICT (key)
      DO UPDATE SET count = count + 1;
    `;

    const selectSql = `
      SELECT count, reset_at FROM security_rate_limits
      WHERE key = ?1;
    `;

    const batchResults = await db.batch([
      db.prepare(upsertSql).bind(key, resetAt),
      db.prepare(selectSql).bind(key),
    ]);

    const selectRes = batchResults[1];
    const row = selectRes?.results?.[0] as { count?: number; reset_at?: number } | undefined;
    const count = typeof row?.count === 'number' ? row.count : 1;
    const resetSeconds = Math.max(1, resetAt - nowSec);

    // Periodic cleanup of expired buckets
    if (Math.random() < 0.05) {
      const pruneSql = `
        DELETE FROM security_rate_limits
        WHERE reset_at < ?1;
      `;
      db.prepare(pruneSql).bind(nowSec - windowSeconds).run().catch(() => {});
    }

    if (count > maxRequests) {
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
      remaining: Math.max(0, maxRequests - count),
      resetSeconds,
    };
  } catch (err: unknown) {
    console.error('Durable rate limit check encountered error:', err);
    // Fail-closed on telemetry writes: skip recording telemetry, return 204 to user
    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      resetSeconds: windowSeconds,
      limiterFailed: true,
    };
  }
}

/**
 * Helper to reset rate limit store in tests.
 */
export function resetRateLimitStore(): void {
  ipStore.clear();
}

