"use server";

import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { AuthError } from "next-auth";
import { userProfiles, users } from "@movai/db";
import { signIn } from "@/auth";
import { db } from "./db";

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

  return signInWithCredentials(parsed.email, parsed.password);
}

export async function signInAction(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = parseCredentials(formData);
  if ("error" in parsed) return parsed;

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
    throw error;
  }
  return {};
}
