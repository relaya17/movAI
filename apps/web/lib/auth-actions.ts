"use server";

import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { AuthError } from "next-auth";
import { userProfiles, users, isUniqueViolation, grantSignupBonus } from "@movai/db";
import { signIn } from "@/auth";
import { db } from "./db";
import { checkRateLimit, loginRateLimitKey } from "./rate-limit";
import { issueAndSendVerificationEmail } from "./email-verification-actions";

/**
 * Brute-force guard on login (review finding: no rate limiting on
 * credentials sign-in at all). Deliberately counts every attempt through
 * this action, not just failed ones - simpler than tracking success/failure
 * separately, and also blunts credential-stuffing/enumeration attempts that
 * a "failures only" counter wouldn't catch. Keyed by the submitted email
 * (not IP - Next.js server actions don't have a clean, spoof-resistant way
 * to read the caller's IP without trusting a proxy header), so this
 * protects a given account regardless of how many source IPs are used
 * against it.
 */
const LOGIN_RATE_LIMIT = { max: 5, windowSeconds: 15 * 60 };

const credentialsSchema = z.object({
  email: z.string().email("כתובת אימייל לא תקינה"),
  password: z.string().min(8, "הסיסמה חייבת להכיל לפחות 8 תווים")
});

const signUpSchema = credentialsSchema.extend({
  firstName: z.string().trim().min(1, "שם פרטי הוא שדה חובה"),
  lastName: z.string().trim().min(1, "שם משפחה הוא שדה חובה"),
  username: z
    .string()
    .trim()
    .min(3, "שם משתמש חייב להכיל לפחות 3 תווים")
    .max(30, "שם משתמש ארוך מדי")
    .regex(/^[a-zA-Z0-9_]+$/, "שם משתמש יכול להכיל רק אותיות באנגלית, מספרים וקו תחתון"),
  dateOfBirth: z
    .string()
    .min(1, "תאריך לידה הוא שדה חובה")
    .refine((value) => !Number.isNaN(Date.parse(value)), "תאריך לידה לא תקין")
    .refine((value) => {
      const birthDate = new Date(value);
      const today = new Date();
      const minAgeDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
      return birthDate <= minAgeDate;
    }, "יש להיות בן/בת 13 לפחות כדי להירשם")
});

/** Password hashing cost - 12 rounds is bcrypt's standard balance of security vs. latency for an auth-only hot path. */
const BCRYPT_COST = 12;

export interface AuthActionState {
  error?: string;
}

function parseCredentials(formData: FormData): { email: string; password: string } | { error: string } {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "פרטים לא תקינים" };
  }
  return parsed.data;
}

function parseSignUp(formData: FormData):
  | {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      username: string;
      dateOfBirth: string;
    }
  | { error: string } {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    username: formData.get("username"),
    dateOfBirth: formData.get("dateOfBirth")
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "פרטים לא תקינים" };
  }
  return parsed.data;
}

export async function signUpAction(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = parseSignUp(formData);
  if ("error" in parsed) return parsed;

  try {
    const existingEmail = await db.select({ id: users.id }).from(users).where(eq(users.email, parsed.email)).limit(1);
    if (existingEmail.length > 0) {
      return { error: "כבר קיים חשבון עם האימייל הזה - נסו להתחבר במקום" };
    }

    const existingUsername = await db
      .select({ userId: userProfiles.userId })
      .from(userProfiles)
      .where(eq(userProfiles.username, parsed.username))
      .limit(1);
    if (existingUsername.length > 0) {
      return { error: "שם המשתמש כבר תפוס - נסו שם אחר" };
    }

    const passwordHash = await hash(parsed.password, BCRYPT_COST);
    const fullName = `${parsed.firstName} ${parsed.lastName}`;

    // The checks above are a courtesy (fast, friendly error before touching
    // anything) - they are NOT what actually prevents a duplicate account.
    // Two signups for the same email/username submitted at nearly the same
    // moment can both pass those checks before either insert commits; the
    // real backstop is the unique constraint on users.email / user_profiles
    // .username (schema/auth.ts, schema/social.ts). Without this try/catch,
    // that constraint violation would have surfaced as an unhandled 500
    // instead of the same friendly message the pre-check gives everyone else.
    const [createdUser] = await db
      .insert(users)
      .values({
        email: parsed.email,
        name: fullName,
        passwordHash
      })
      .returning({ id: users.id });

    if (!createdUser) {
      return { error: "לא הצלחנו ליצור את החשבון - נסו שוב" };
    }

    await db.insert(userProfiles).values({
      userId: createdUser.id,
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      username: parsed.username,
      dateOfBirth: parsed.dateOfBirth
    });

    await grantSignupBonus(db, createdUser.id);

    // Best-effort - a signup must never fail just because the email provider
    // hiccuped. The user still gets a working account either way; they can
    // always request the link again later via resendVerificationEmailAction.
    try {
      await issueAndSendVerificationEmail(createdUser.id, parsed.email);
    } catch (error) {
      console.error("[signUpAction] failed to send verification email", error);
    }

    return signInWithCredentials(parsed.email, parsed.password);
  } catch (error) {
    if (isUniqueViolation(error)) {
      const constraint = getConstraintName(error);
      if (constraint?.includes("username")) {
        return { error: "שם המשתמש כבר תפוס - נסו שם אחר" };
      }
      return { error: "כבר קיים חשבון עם האימייל הזה - נסו להתחבר במקום" };
    }
    if (isInfraUnavailable(error)) {
      return { error: "השרת המקומי לא מחובר למסד הנתונים כרגע. הפעילו את Docker (postgres) ונסו שוב." };
    }
    throw error;
  }
}

function getConstraintName(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "constraint_name" in error) {
    const value = (error as { constraint_name: unknown }).constraint_name;
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}

/** Postgres/Redis down locally (no Docker) - surface a clear message instead of hanging or 500ing. */
function isInfraUnavailable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  return (
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "ENOTFOUND" ||
    code === "CONNECT_TIMEOUT" ||
    /connect|ECONNREFUSED|timeout/i.test(error.message)
  );
}

export async function signInAction(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = parseCredentials(formData);
  if ("error" in parsed) return parsed;

  const rateLimit = await checkRateLimit(loginRateLimitKey(parsed.email), LOGIN_RATE_LIMIT);
  if (!rateLimit.allowed) {
    const minutes = Math.max(1, Math.ceil((rateLimit.retryAfterSeconds ?? LOGIN_RATE_LIMIT.windowSeconds) / 60));
    return { error: `יותר מדי ניסיונות התחברות כושלים. נסו שוב בעוד כ-${minutes} דקות.` };
  }

  return signInWithCredentials(parsed.email, parsed.password);
}

/**
 * signIn() redirects on success by throwing Next.js's internal redirect
 * signal - that must propagate, not be swallowed as an error. Only
 * AuthError (wrong password, etc.) should turn into a user-facing message.
 */
async function signInWithCredentials(email: string, password: string): Promise<AuthActionState> {
  try {
    await signIn("credentials", { email, password, redirectTo: "/browse" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "אימייל או סיסמה שגויים" };
    }
    if (isInfraUnavailable(error)) {
      return { error: "השרת המקומי לא מחובר למסד הנתונים כרגע. הפעילו את Docker (postgres) ונסו שוב." };
    }
    throw error;
  }
  return {};
}
