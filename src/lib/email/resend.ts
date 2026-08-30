import "server-only";

import { Resend } from "resend";

// Resend's shared sandbox sender -- only delivers to the email address the
// Resend account itself was signed up with, until a real domain is
// verified. Swap FROM_ADDRESS once a domain is added, nothing else here
// needs to change.
const FROM_ADDRESS = "AXIZ Vision Care <onboarding@resend.dev>";

/**
 * Sends the password reset link by email. Falls back to logging the link
 * to the server console if RESEND_API_KEY isn't configured, so local dev
 * without an API key keeps working exactly as it did before.
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(`[password reset] ${to}: ${resetUrl}`);
    return;
  }

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "Reset your password",
    text: `We received a request to reset your password.\n\nFollow this link to choose a new one:\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email. The link expires in 1 hour.`,
    html: `
      <p>We received a request to reset your password.</p>
      <p><a href="${resetUrl}">Click here to choose a new password</a></p>
      <p>If you didn't request this, you can safely ignore this email. The link expires in 1 hour.</p>
    `,
  });

  if (error) {
    // Don't let an email-provider hiccup surface as a 500 to the
    // optometrist -- the link is still valid and usable if relayed
    // manually, so log loudly instead of throwing.
    console.error("[password reset] Resend send failed, falling back to console log", error);
    console.log(`[password reset] ${to}: ${resetUrl}`);
  }
}
