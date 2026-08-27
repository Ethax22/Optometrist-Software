/**
 * The pure fixed-window rate-limit algorithm, deliberately dependency-free
 * (no "server-only", no Next imports) so it's unit-testable directly. The
 * app-facing wrapper (getClientIp, the "server-only" guard) lives in
 * rate-limit.ts.
 *
 * In-memory only -- fine for a single-instance deployment (this app
 * targets a VPS or one Vercel deployment for two optometrists, not a
 * horizontally-scaled fleet). If this ever runs as multiple replicas
 * sharing no memory, each instance enforces its own separate limit --
 * swap the Map for a shared store (Redis, etc.) at that point; nothing
 * else about the call sites needs to change.
 */

const buckets = new Map<string, { count: number; resetAt: number }>();

// Periodically drop expired buckets so this doesn't grow unbounded.
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt < now) buckets.delete(key);
      }
    },
    10 * 60 * 1000,
  ).unref?.();
}

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/**
 * @param key A namespace + identifier, e.g. `login:${email}` or `search:${ip}`.
 * @param limit Max attempts allowed within windowMs.
 * @param windowMs Window length in milliseconds.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true };
}

/** Test-only: clears all buckets so tests don't leak state into each other. */
export function _resetForTests(): void {
  buckets.clear();
}
