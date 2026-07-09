import { Resend } from "resend";

/**
 * Same "degrade gracefully, log clearly" pattern already used for
 * Cloudinary/Replicate/Sentry elsewhere in this app (see lib/replicate.ts,
 * lib/media-storage.ts): without RESEND_API_KEY set, password reset and
 * email verification still *work* end to end in local dev - the link just
 * gets logged to the server console instead of actually emailed, so nobody
 * needs a real Resend account to test either flow.
 */
let cachedClient: Resend | null = null;
let cachedClientKey: string | undefined;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  if (!cachedClient || cachedClientKey !== apiKey) {
    cachedClient = new Resend(apiKey);
    cachedClientKey = apiKey;
  }
  return cachedClient;
}

const EMAIL_FROM = process.env.EMAIL_FROM ?? "MoVAI <onboarding@resend.dev>";

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const client = getResendClient();
  if (!client) {
    console.warn(`[email] RESEND_API_KEY not set - password reset link for ${to}:\n${resetUrl}`);
    return;
  }

  await client.emails.send({
    from: EMAIL_FROM,
    to,
    subject: "איפוס סיסמה ל-MoVAI",
    html: `
      <div dir="rtl" style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>איפוס סיסמה</h2>
        <p>קיבלנו בקשה לאיפוס הסיסמה לחשבון שלכם ב-MoVAI.</p>
        <p><a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background: #06b6d4; color: white; border-radius: 8px; text-decoration: none;">לאיפוס הסיסמה</a></p>
        <p style="color: #666; font-size: 13px;">הקישור בתוקף לשעה אחת. אם לא ביקשתם זאת, אפשר פשוט להתעלם מהמייל הזה - הסיסמה שלכם לא תשתנה.</p>
      </div>
    `
  });
}

/**
 * Support-inbox notification for the /contact form. Real, answered support
 * is a deliberate differentiator here - see architecture discussion on big
 * streaming platforms leaving the vast majority of complaints unanswered.
 * Sent to SUPPORT_EMAIL, falling back to the first ADMIN_EMAILS entry so a
 * single operator doesn't need to configure the same address twice.
 */
export async function sendContactMessage(input: { name: string; fromEmail: string; message: string }): Promise<void> {
  const supportEmail = process.env.SUPPORT_EMAIL ?? (process.env.ADMIN_EMAILS ?? "").split(",")[0]?.trim();
  if (!supportEmail) {
    console.warn(`[email] No SUPPORT_EMAIL/ADMIN_EMAILS configured - contact message from ${input.fromEmail} logged only:\n${input.message}`);
    return;
  }

  const client = getResendClient();
  if (!client) {
    console.warn(`[email] RESEND_API_KEY not set - contact message from ${input.fromEmail} to ${supportEmail}:\n${input.message}`);
    return;
  }

  await client.emails.send({
    from: EMAIL_FROM,
    to: supportEmail,
    replyTo: input.fromEmail,
    subject: `פנייה חדשה מ-MoVAI: ${input.name}`,
    html: `
      <div dir="rtl" style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>פנייה חדשה מהאתר</h2>
        <p><strong>שם:</strong> ${escapeHtml(input.name)}</p>
        <p><strong>אימייל:</strong> ${escapeHtml(input.fromEmail)}</p>
        <p><strong>הודעה:</strong></p>
        <p style="white-space: pre-wrap;">${escapeHtml(input.message)}</p>
      </div>
    `
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
  const client = getResendClient();
  if (!client) {
    console.warn(`[email] RESEND_API_KEY not set - verification link for ${to}:\n${verifyUrl}`);
    return;
  }

  await client.emails.send({
    from: EMAIL_FROM,
    to,
    subject: "אמתו את כתובת האימייל שלכם ב-MoVAI",
    html: `
      <div dir="rtl" style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>ברוכים הבאים ל-MoVAI!</h2>
        <p>נשאר רק לאמת את כתובת האימייל שלכם.</p>
        <p><a href="${verifyUrl}" style="display: inline-block; padding: 10px 20px; background: #06b6d4; color: white; border-radius: 8px; text-decoration: none;">לאימות האימייל</a></p>
        <p style="color: #666; font-size: 13px;">הקישור בתוקף ל-24 שעות.</p>
      </div>
    `
  });
}
