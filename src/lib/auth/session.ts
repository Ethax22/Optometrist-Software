import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sessions, users } from "@/lib/db/schema";
import { generateToken, hashToken } from "./tokens";
import { SESSION_COOKIE_NAME } from "./constants";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type AppUser = typeof users.$inferSelect;

/** Creates a session row and sets the session cookie on the response. */
export async function createSession(userId: string): Promise<void> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(sessions).values({ id: tokenHash, userId, expiresAt });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Deletes the current session (if any) both from the DB and the cookie.
 * Returns the user id that was signed out, or null if there was no session. */
export async function destroySession(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  let userId: string | null = null;
  if (token) {
    const [deleted] = await db
      .delete(sessions)
      .where(eq(sessions.id, hashToken(token)))
      .returning({ userId: sessions.userId });
    userId = deleted?.userId ?? null;
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
  return userId;
}

/** Deletes every session for a user -- used after a password reset. */
export async function destroyAllUserSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

async function getSessionUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const [row] = await db
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, tokenHash))
    .limit(1);

  if (!row || row.expiresAt.getTime() < Date.now()) {
    return null;
  }

  return row.user;
}

/**
 * The single server-side authorization boundary for the app. Every server
 * action / server component that touches patient data must call this --
 * a lightweight cookie-presence check in proxy.ts only guards page
 * navigation and must never be relied on as the actual authorization gate.
 *
 * Confirms there is a valid, unexpired session AND that the user is an
 * active optometrist. Redirects to /login otherwise.
 */
export async function requireOptometrist(): Promise<{ appUser: AppUser }> {
  const appUser = await getSessionUser();

  if (!appUser || appUser.role !== "optometrist" || !appUser.isActive) {
    redirect("/login");
  }

  return { appUser };
}
