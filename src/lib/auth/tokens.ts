import "server-only";

import { randomBytes, createHash } from "crypto";

/** A high-entropy random token safe to put in a cookie or a reset-link URL. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 hash (hex) of a raw token, for storage -- never store raw tokens. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
