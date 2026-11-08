import { randomBytes } from "node:crypto";
import { env } from "../../config/env.js";
import { hashOpaqueToken } from "../../common/security/tokens.js";
import { emailTokenRepository } from "./email-token.repository.js";

const testOutbox = [];

async function deliverEmail({ to, subject, text, html }) {
  if (env.emailProvider === "disabled") return;

  if (env.emailProvider === "memory") {
    testOutbox.push({ to, subject, text, html });
    return;
  }

  if (env.emailProvider === "console") {
    // Local development only. The token is printed so the API can be tested without SMTP credentials.
    console.info(`[development email] to=${to} subject=${subject}\n${text}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.emailFrom,
      to: [to],
      subject,
      text,
      html
    })
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    console.error("Email provider rejected a message:", response.status, responseText.slice(0, 300));
    const error = new Error("Email delivery failed");
    error.statusCode = 502;
    error.code = "EMAIL_DELIVERY_FAILED";
    throw error;
  }
}

async function issueToken(user, purpose, lifetimeMs) {
  await emailTokenRepository.invalidateActiveForUser(user._id, purpose);
  const token = randomBytes(32).toString("base64url");
  await emailTokenRepository.create({
    userId: user._id,
    tokenHash: hashOpaqueToken(token),
    purpose,
    expiresAt: new Date(Date.now() + lifetimeMs)
  });
  return token;
}

export const emailService = {
  async sendVerification(user) {
    if (env.emailProvider === "disabled") return;
    const token = await issueToken(user, "EMAIL_VERIFICATION", 24 * 60 * 60 * 1000);
    await deliverEmail({
      to: user.email,
      subject: "Verify your Saraha App email",
      text: `Hello ${user.name},\n\nYour email verification token is:\n${token}\n\nSubmit it to POST ${env.appBaseUrl}/api/v1/auth/verify-email as { "token": "..." }. The token expires in 24 hours.`,
      html: `<p>Hello ${escapeHtml(user.name)},</p><p>Your email verification token is:</p><p><code>${token}</code></p><p>Submit it to <code>POST ${escapeHtml(env.appBaseUrl)}/api/v1/auth/verify-email</code>. The token expires in 24 hours.</p>`
    });
  },

  async sendPasswordReset(user) {
    if (env.emailProvider === "disabled") return;
    const token = await issueToken(user, "PASSWORD_RESET", 15 * 60 * 1000);
    await deliverEmail({
      to: user.email,
      subject: "Reset your Saraha App password",
      text: `Hello ${user.name},\n\nYour password reset token is:\n${token}\n\nSubmit it to POST ${env.appBaseUrl}/api/v1/auth/reset-password with your new password. The token expires in 15 minutes.`,
      html: `<p>Hello ${escapeHtml(user.name)},</p><p>Your password reset token is:</p><p><code>${token}</code></p><p>Submit it to <code>POST ${escapeHtml(env.appBaseUrl)}/api/v1/auth/reset-password</code>. The token expires in 15 minutes.</p>`
    });
  },

  getTestOutbox() {
    if (env.nodeEnv !== "test") throw new Error("The email test outbox is available only in test mode");
    return [...testOutbox];
  },

  clearTestOutbox() {
    if (env.nodeEnv !== "test") throw new Error("The email test outbox is available only in test mode");
    testOutbox.length = 0;
  }
};

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[character]
  );
}
