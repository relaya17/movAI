import { integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";

/** Per-user referral code (e.g. shared as ?ref=CODE). */
export const referralCodes = pgTable("referral_codes", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

/** Tracks successful referral redemptions (one referred user → one row). */
export const referralRedemptions = pgTable("referral_redemptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  referrerUserId: text("referrer_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  referredUserId: text("referred_user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  creditsAwarded: integer("credits_awarded").notNull().default(5),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

/** Onboarding drip emails sent (day 0 / 3 / 7). */
export const onboardingDripLog = pgTable(
  "onboarding_drip_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dripDay: integer("drip_day").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [unique("onboarding_drip_log_user_id_drip_day_unique").on(table.userId, table.dripDay)]
);
