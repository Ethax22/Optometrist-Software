"use server";

import { redirect } from "next/navigation";
import { eq, and, isNull, gt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "./password";
import { createSession, destroySession, destroyAllUserSessions } from "./session";
import { generateToken, hashToken } from "./tokens";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";

export type ActionResult = { error: string } | { success: true };

const RESET_TOKEN_DURATION_MS = 60 * 60 * 1000; // 1 hour

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email.toLowerCase()))
    .limit(1);

  if (!user || !user.isActive) {
    return { error: "Invalid email or password" };
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    return { error: "Invalid email or password" };
  }

  await createSession(user.id);

  const next = formData.get("next");
  redirect(typeof next === "string" && next.startsWith("/") ? next : "/home");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function forgotPasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email.toLowerCase()))
    .limit(1);

  // Always report success regardless of whether the email exists, to avoid
  // leaking which addresses are registered optometrists.
  if (user) {
    const token = generateToken();
    await db.insert(passwordResetTokens).values({
      id: hashToken(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + RESET_TOKEN_DURATION_MS),
    });

    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const resetUrl = `${origin}/reset-password?token=${token}`;

    // No email provider is configured -- there are only two optometrists
    // using this instance, so the reset link is handed over directly
    // (printed here for whoever has server access to relay it).
    console.log(`[password reset] ${user.email}: ${resetUrl}`);
  }

  return { success: true };
}

export async function resetPasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const token = formData.get("token");
  if (typeof token !== "string" || !token) {
    return { error: "Your reset link is invalid. Please request a new one." };
  }

  const tokenHash = hashToken(token);
  const [resetToken] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.id, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!resetToken) {
    return { error: "Your reset link has expired. Please request a new one." };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, resetToken.userId));
    await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, tokenHash));
  });

  await destroyAllUserSessions(resetToken.userId);

  redirect("/login");
}
