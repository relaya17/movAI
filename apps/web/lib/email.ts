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
