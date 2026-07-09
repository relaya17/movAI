"use server";

import { z } from "zod";
import { checkRateLimit } from "./rate-limit";
import { sendContactMessage } from "./email";

const ContactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  message: z.string().trim().min(10).max(4000)
});

export type ContactFormState = { ok: true } | { ok: false; error: string };

/**
 * Real support channel, not a black hole - see the "96% of complaints go
 * unanswered" competitive gap this is meant to close (architecture
 * discussion). Rate-limited per email the same way login is, so the form
 * can't be used to spam the support inbox.
 */
export async function submitContactMessage(_prevState: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const parsed = ContactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message")
  });

  if (!parsed.success) {
    return { ok: false, error: "invalid_input" };
  }

  const { name, email, message } = parsed.data;

  const rateLimit = await checkRateLimit(`movai:contact:${email.toLowerCase()}`, { max: 5, windowSeconds: 3600 });
  if (!rateLimit.allowed) {
    return { ok: false, error: "rate_limited" };
  }

  try {
    await sendContactMessage({ name, fromEmail: email, message });
    return { ok: true };
  } catch (error) {
    console.error("[contact] failed to send message", error);
    return { ok: false, error: "send_failed" };
  }
}
