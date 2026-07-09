"use server";

import { redirect } from "next/navigation";
import { compare, hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { users, createPasswordResetToken, consumePasswordResetToken } from "@movai/db";
import { db } from "./db";
import { sendPasswordResetEmail } from "./email";
import { checkRateLimit } from "./rate-limit";
import type { AuthActionState } from "./auth-actions";

/**
 * Distinct from AuthActionState (sign-in/sign-up either error out or
 * redirect on success, with nothing in between) - a reset-request has a
 * genuine third state to show: "we sent a link" without any redirect
 * happening, so the UI needs an explicit signal for that.
 */
export interface PasswordResetRequestState {
  error?: string;
  submitted?: boolean;
}

const BCRYPT_COST = 12;

const REQUEST_RATE_LIMIT = { max: 3, windowSeconds: 15 * 60 };

const emailSchema = z.object({ email: z.string().email("כתובת אימייל לא תקינה") });

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "הסיסמה חייבת להכיל לפחות 8 תווים")
});

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100";
}

/**
 * Always returns the same generic success message, whether or not an
 * account exists for that email (and whether or not it's a password-based
 * account vs. Google/GitHub-only) - anything more specific here would let
 * an attacker use this form to enumerate which emails have accounts.
 */
export async function requestPasswordResetAction(
  _prevState: PasswordResetRequestState,
  formData: FormData
): Promise<PasswordResetRequestState> {
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "פרטים לא תקינים" };
  }
  const email = parsed.data.email;

  // Rate-limited by email, same reasoning as login (lib/rate-limit.ts) -
  // stops this form itself being used to spam a user's inbox with reset
  // emails, independent of whether the account exists.
  const rateLimit = await checkRateLimit(`movai:password-reset-request:${email.toLowerCase()}`, REQUEST_RATE_LIMIT);
  if (!rateLimit.allowed) {
    // Still the generic "submitted" response - a distinct "you're rate
    // limited" message would itself leak whether the account exists (only
    // real accounts would ever hit this path repeatedly in a legitimate flow).
    return { submitted: true };
  }

  const [user] = await db.select({ id: users.id, passwordHash: users.passwordHash }).from(users).where(eq(users.email, email)).limit(1);

  // Only credentials-based accounts (passwordHash set) have a password to
  // reset - a Google/GitHub-only account has nothing here to send a link
  // for, but we still report success so this doesn't leak which is which.
  if (user?.passwordHash) {
    const { rawToken } = await createPasswordResetToken(db, user.id);
    const resetUrl = `${appUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;
    await sendPasswordResetEmail(email, resetUrl);
  }

  return { submitted: true };
}

export async function resetPasswordAction(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password")
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "פרטים לא תקינים" };
  }

  const userId = await consumePasswordResetToken(db, parsed.data.token);
  if (!userId) {
    return { error: "הקישור לא תקין או שפג תוקפו - בקשו קישור חדש" };
  }

  const [user] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId)).limit(1);
  // Defense in depth: never let a new password be identical to the current
  // one via a stolen-but-still-valid reset link silently no-op-ing trust
  // assumptions - not required, but comparing costs nothing here and this
  // is one of the few places in the app where extra paranoia is cheap.
  if (user?.passwordHash && (await compare(parsed.data.password, user.passwordHash))) {
    return { error: "הסיסמה החדשה חייבת להיות שונה מהסיסמה הנוכחית" };
  }

  const passwordHash = await hash(parsed.data.password, BCRYPT_COST);
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));

  redirect("/sign-in?passwordReset=1");
}
