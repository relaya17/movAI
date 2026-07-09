import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { boolean, decimal, integer, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./auth";

/**
 * Premium subscription tiers (day/week/month/year passes). Deliberately NOT
 * a catalog paywall - the movies/standup/music/singing catalog stays free
 * for everyone regardless of subscription status (see apps/web/lib/movies.ts
 * and browse/page.tsx). What a subscription actually buys: a bundled,
 * discounted allotment of AI Studio credits each period plus non-content
 * perks (ad-free browsing, priority generation queue, early feature access).
 * This split matters legally too - TMDB/YouTube's terms constrain what can
 * be done with *their* content, but say nothing about MoVAI's own Studio
 * credits or UI experience (see movai-architecture-plan.md §1, §9).
 */
export const subscriptionIntervalEnum = pgEnum("subscription_interval", ["daily", "weekly", "monthly", "yearly"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "canceled", "past_due", "incomplete"]);

/**
 * One row per tier (daily/weekly/monthly/yearly) - seeded via
 * apps/web/scripts/seed-subscription-plans.ts, same pattern as
 * schema/credits.ts's creditPackages. `stripePriceId` is filled in after the
 * matching Stripe Price is created (see that seed script) - null until then,
 * which lib/subscription-actions.ts treats as "not purchasable yet" rather
 * than crashing.
 */
export const subscriptionPlans = pgTable("subscription_plans", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  interval: subscriptionIntervalEnum("interval").notNull().unique(),
  name: text("name").notNull(),
  priceNis: decimal("price_nis", { precision: 10, scale: 2 }).notNull(),
  creditsPerPeriod: integer("credits_per_period").notNull().default(0),
  adFree: boolean("ad_free").notNull().default(true),
  priorityQueue: boolean("priority_queue").notNull().default(false),
  earlyAccess: boolean("early_access").notNull().default(false),
  founderBadge: boolean("founder_badge").notNull().default(false),
  stripePriceId: text("stripe_price_id"),
  isActive: integer("is_active").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

/**
 * A user's subscription history - one new row per Stripe subscription
 * object (resubscribing after a cancellation creates a new row rather than
 * reusing the old one, so past periods stay auditable). `stripeSubscriptionId`
 * is the idempotency key the webhook (app/api/webhooks/stripe/route.ts)
 * upserts on - Stripe redelivers webhook events, so "subscription updated"
 * firing twice for the same event must never create two rows.
 */
export const userSubscriptions = pgTable(
  "user_subscriptions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planId: text("plan_id")
      .notNull()
      .references(() => subscriptionPlans.id),
    status: subscriptionStatusEnum("status").notNull().default("incomplete"),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    // Applications-layer code checks-then-creates "at most one active
    // subscription per user", which has the usual race-condition gap under
    // concurrent requests (e.g. two webhook deliveries). This partial unique
    // index makes it a hard DB guarantee: a second attempt to insert/update a
    // second row to status "active" for the same user throws a unique
    // violation instead of silently creating two simultaneously-active
    // subscriptions.
    oneActivePerUser: uniqueIndex("user_subscriptions_one_active_per_user")
      .on(table.userId)
      .where(sql`${table.status} = 'active'`)
  })
);
