import { randomUUID } from "node:crypto";
import { integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Schema shape follows the official @auth/drizzle-adapter convention for
 * Postgres exactly (table/column names are load-bearing - the adapter reads
 * them by name, not just by type). Do not rename these tables casually; see
 * https://authjs.dev/getting-started/adapters/drizzle for the contract this
 * mirrors. Domain-specific user data (genre preferences, etc.) intentionally
 * lives in a separate `userPreferences` table (schema/social.ts) rather than
 * being bolted onto this one, so an Auth.js version bump never conflicts
 * with our own columns.
 */
export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  // Only set for email/password sign-ups (Credentials provider). Null for
  // users who only ever signed in via Google/GitHub - never required, never
  // read outside the Credentials authorize() callback.
  passwordHash: text("passwordHash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state")
  },
  (table) => [primaryKey({ columns: [table.provider, table.providerAccountId] })]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull()
});

export const verificationTokens = pgTable(
  "verificationTokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull()
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })]
);

