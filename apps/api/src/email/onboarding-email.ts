import { Resend } from "resend";

let cachedClient: Resend | null = null;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!cachedClient) cachedClient = new Resend(apiKey);
  return cachedClient;
}

const EMAIL_FROM = process.env.EMAIL_FROM ?? "MoVAI <onboarding@resend.dev>";

export async function sendOnboardingDripEmail(to: string, name: string | null, dripDay: 3 | 7): Promise<void> {
  const client = getResendClient();
  const greeting = name ? `שלום ${name}` : "שלום";

  const content =
    dripDay === 3
      ? {
          subject: "טיפים ליצירה ב-MoVAI — יום 3",
          body: `
            <p>${greeting},</p>
            <p>כבר שלושה ימים ב-MoVAI! נסו ליצור מוזיקה קצרה ב-<strong>AI Studio</strong> ולשתף אותה בגלריה.</p>
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100"}/studio">לסטודיו ←</a></p>
          `
        }
      : {
          subject: "המשיכו ליצור — יום 7 ב-MoVAI",
          body: `
            <p>${greeting},</p>
            <p>שבוע שלם ב-MoVAI! הוסיפו תוכן לרשימת הצפייה, בקשו כתוביות לסרט, ונסו יצירת וידאו Pro.</p>
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100"}/browse">לגלישה ←</a></p>
          `
        };

  if (!client) {
    console.warn(`[email] RESEND_API_KEY not set - onboarding drip day ${dripDay} for ${to}`);
    return;
  }

  await client.emails.send({
    from: EMAIL_FROM,
    to,
    subject: content.subject,
    html: `<div dir="rtl" style="font-family: sans-serif; max-width: 480px;">${content.body}</div>`
  });
}
