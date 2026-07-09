import { randomBytes, createHash } from "node:crypto";
import { and, eq, isNull, gt } from "drizzle-orm";
import type { Database } from "../client";
import { passwordResetTokens, emailVerificationTokens, users } from "../schema/index";

const RAW_TOKEN_BYTES = 32; // 256 bits - matches session-token-grade entropy elsewhere in this app
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours - less sensitive than a password reset, longer fuse is fine

function generateRawToken(): string {
  return randomBytes(RAW_TOKEN_BYTES).toString("base64url");
}

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export interface IssuedToken {
  /** The value to embed in the emailed link - never stored anywhere, only its hash is. */
  rawToken: string;
  expiresAt: Date;
}

/**
 * Mints a password-reset token for a user. Any of that user's prior
 * still-valid reset tokens are invalidated first (by marking them used) -
 * requesting a new reset link should make any older, possibly-already-sent
 * link stop working, not leave multiple simultaneously-valid tokens around.
 */
export async function createPasswordResetToken(db: Database, userId: string): Promise<IssuedToken> {
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)));

  const rawToken = generateRawToken();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash: hashToken(rawToken),
    expiresAt
  });

  return { rawToken, expiresAt };
}

/**
 * Verifies and consumes a password-reset token in one step (marks it used
 * immediately) - returns the associated userId on success, or `undefined`
 * if the token is unknown, expired, or already used. Callers must treat
 * `undefined` as "show a generic invalid-or-expired-link error," never
 * distinguishing *why* it failed (that distinction is exactly the kind of
 * detail that helps an attacker enumerate valid tokens).
 */
export async function consumePasswordResetToken(db: Database, rawToken: string): Promise<string | undefined> {
  const tokenHash = hashToken(rawToken);
  const now = new Date();

  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, now)
      )
    )
    .limit(1);

  if (!row) return undefined;

  await db.update(passwordResetTokens).set({ usedAt: now }).where(eq(passwordResetTokens.id, row.id));

  return row.userId;
}

/** Same pattern as createPasswordResetToken, for email-ownership verification instead. */
export async function createEmailVerificationToken(db: Database, userId: string): Promise<IssuedToken> {
  await db
    .update(emailVerificationTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(emailVerificationTokens.userId, userId), isNull(emailVerificationTokens.usedAt)));

  const rawToken = generateRawToken();
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

  await db.insert(emailVerificationTokens).values({
    userId,
    tokenHash: hashToken(rawToken),
    expiresAt
  });

  return { rawToken, expiresAt };
}

/**
 * Verifies and consumes an email-verification token, and marks the user's
 * email as verified in the same operation. Returns the userId on success,
 * `undefined` otherwise (same "don't distinguish why" rule as above).
 */
export async function consumeEmailVerificationToken(db: Database, rawToken: string): Promise<string | undefined> {
  const tokenHash = hashToken(rawToken);
  const now = new Date();

  const [row] = await db
    .select()
    .from(emailVerificationTokens)
    .where(
      and(
        eq(emailVerificationTokens.tokenHash, tokenHash),
        isNull(emailVerificationTokens.usedAt),
        gt(emailVerificationTokens.expiresAt, now)
      )
    )
    .limit(1);

  if (!row) return undefined;

  await db.update(emailVerificationTokens).set({ usedAt: now }).where(eq(emailVerificationTokens.id, row.id));
  await db.update(users).set({ emailVerified: now }).where(eq(users.id, row.userId));

  return row.userId;
}
