"use server";

import { eq } from "drizzle-orm";
import { users, createEmailVerificationToken, consumeEmailVerificationToken } from "@movai/db";
import { auth } from "@/auth";
import { db } from "./db";
import { sendVerificationEmail } from "./email";
import { checkRateLimit } from "./rate-limit";

const RESEND_RATE_LIMIT = { max: 3, windowSeconds: 15 * 60 };

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100";
}

/** Fires the actual send - shared by signUpAction (auto-send on registration) and the resend action below. */
export async function issueAndSendVerificationEmail(userId: string, email: string): Promise<void> {
  const { rawToken } = await createEmailVerificationToken(db, userId);
  const verifyUrl = `${appUrl()}/verify-email?token=${encodeURIComponent(rawToken)}`;
  await sendVerificationEmail(email, verifyUrl);
}

export interface ResendVerificationState {
  error?: string;
  sent?: boolean;
}

/**
 * Called from a "resend verification email" button while signed in - not a
 * public form, so it trusts the current session's own email rather than
 * taking one as input (there's nothing to enumerate here either way, since
 * only an already-authenticated user can trigger it for their own account).
 * Takes the standard (prevState, formData) shape so it plugs directly into
 * useActionState from a plain empty <form>, even though formData itself
 * carries nothing useful here.
 */
export async function resendVerificationEmailAction(
  _prevState: ResendVerificationState,
  _formData: FormData
): Promise<ResendVerificationState> {
  const session = await auth();
  const email = session?.user?.email;
  const userId = session?.user?.id;
  if (!email || !userId) {
    return { error: "יש להתחבר כדי לבצע פעולה זו" };
  }

  const [user] = await db.select({ emailVerified: users.emailVerified }).from(users).where(eq(users.id, userId)).limit(1);
  if (user?.emailVerified) {
    return { sent: true }; // already verified - nothing to resend, but no need to surface that as an error
  }

  const rateLimit = await checkRateLimit(`movai:resend-verification:${userId}`, RESEND_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return { error: "יותר מדי בקשות - נסו שוב מאוחר יותר" };
  }

  await issueAndSendVerificationEmail(userId, email);
  return { sent: true };
}

export interface VerifyEmailResult {
  success: boolean;
}

/** Consumes a verification token from the emailed link - called directly from the /verify-email page (a GET-triggered action, not a form). */
export async function verifyEmailAction(token: string): Promise<VerifyEmailResult> {
  const userId = await consumeEmailVerificationToken(db, token);
  return { success: Boolean(userId) };
}
