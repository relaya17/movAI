import { randomUUID } from "node:crypto";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./auth";

/**
 * Deliberately a dedicated table, not a reuse of Auth.js's own
 * `verificationTokens` table (schema/auth.ts) - that table is reserved for
 * Auth.js's own adapter contract (email/magic-link provider verification),
 * and a password-reset credential is a materially more sensitive capability
 * than an email-ownership proof; keeping them in separate tables means a
 * token minted for one purpose can never accidentally be accepted for the
 * other.
 *
 * `tokenHash`, not the raw token, is what's stored - same rationale as
 * password hashing: a database read/backup leak must never itself be a
 * usable "reset anyone's password" credential. The raw token only ever
 * exists in the emailed link and briefly in server memory while verifying
 * it (see repositories/password-reset.ts).
 */
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  /** Single-use enforcement - a token is checked as valid only while this is null. */
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

/**
 * Same tokenHash/single-use design as passwordResetTokens above, for the
 * same reasons - kept as its own table rather than reusing Auth.js's
 * `verificationTokens` (schema/auth.ts) so this app's own email-verification
 * flow never has to reason about that table's adapter-owned contract.
 * Consuming a valid row here is what sets `users.emailVerified`.
 */
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});
