import "server-only";

import { headers } from "next/headers";

export { checkRateLimit, type RateLimitResult } from "./rate-limit-core";

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
