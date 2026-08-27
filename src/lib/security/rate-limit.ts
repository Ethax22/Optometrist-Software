import "server-only";

import { headers } from "next/headers";

/**
 * In-memory fixed-window rate limiter. Fine for a single-instance
 * deployment (this app targets a VPS or a single Vercel deployment for
 * two optometrists, not a horizontally-scaled fleet) -- if this ever runs
 * as multiple instances/serverless replicas sharing no memory, each
 * instance would enforce its own separate limit. Swap the Map for a
 * shared store (Redis, etc.) at that point; nothing else about the
 * call sites below needs to change.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

// Periodically drop expired buckets so this doesn't grow unbounded.
setInterval(
  () => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt < now) buckets.delete(key);
    }
  },
  10 * 60 * 1000,
).unref?.();

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

/** Best-effort client IP from proxy headers -- trust only as a rate-limit
 * key, never as an identity/authorization signal (it's trivially spoofable
 * by the client unless a trusted reverse proxy strips/overwrites it). */
export async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return headerList.get("x-real-ip") ?? "unknown";
}
