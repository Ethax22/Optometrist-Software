import "server-only";

import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

/**
 * Local-disk signature storage. Works for a VPS deployment (files persist
 * on the instance's own disk) but NOT for Vercel/serverless, where the
 * filesystem is ephemeral per invocation -- if hosting ends up on Vercel,
 * swap this module's implementation for an S3-compatible bucket (R2, S3,
 * Supabase Storage, etc.) behind the same three functions, and nothing
 * else in the app needs to change.
 */

const STORAGE_ROOT = path.join(process.cwd(), "storage", "signatures");

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function extensionFor(mimeType: string): string {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    default:
      throw new Error(`Unsupported signature mime type: ${mimeType}`);
  }
}

/** Saves a signature file for a user, returning its storage path (relative, safe to persist in the DB). */
export async function saveSignature(
  userId: string,
  data: Buffer,
  mimeType: string,
): Promise<string> {
  const userDir = path.join(STORAGE_ROOT, userId);
  await ensureDir(userDir);

  const filename = `${randomUUID()}.${extensionFor(mimeType)}`;
  await fs.writeFile(path.join(userDir, filename), data);

  return path.posix.join(userId, filename);
}

/** Reads a previously-saved signature by its storage path. Returns null if missing. */
export async function readSignature(
  storagePath: string,
): Promise<{ data: Buffer; mimeType: string } | null> {
  const absolutePath = resolveSafe(storagePath);
  if (!absolutePath) return null;

  try {
    const data = await fs.readFile(absolutePath);
    const ext = path.extname(absolutePath).slice(1).toLowerCase();
    const mimeType =
      ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    return { data, mimeType };
  } catch {
    return null;
  }
}

/** Deletes a signature file. No-op if it doesn't exist. */
export async function deleteSignature(storagePath: string): Promise<void> {
  const absolutePath = resolveSafe(storagePath);
  if (!absolutePath) return;

  await fs.rm(absolutePath, { force: true });
}

/** Resolves a stored path to an absolute path, rejecting any traversal outside STORAGE_ROOT. */
function resolveSafe(storagePath: string): string | null {
  const absolutePath = path.join(STORAGE_ROOT, storagePath);
  const normalizedRoot = path.normalize(STORAGE_ROOT + path.sep);
  if (!path.normalize(absolutePath).startsWith(normalizedRoot)) {
    return null;
  }
  return absolutePath;
}
