import { randomUUID } from "node:crypto";
import { integer, pgEnum, pgTable, text, timestamp, decimal, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./auth";

/** Credit transaction types */
export const transactionTypeEnum = pgEnum("transaction_type", [
  "signup_bonus",
  "purchase",
  "usage",
  "refund",
  "gift",
  "promo",
  "subscription",
]);

/** AI creation types */
export const creationTypeEnum = pgEnum("creation_type", [
  "video",
  "music",
  "voice",
  "image",
]);

/** Creation status */
export const creationStatusEnum = pgEnum("creation_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

/**
 * User credit balances.
 * Each user has a single row tracking their current credit balance.
 */
export const creditBalances = pgTable("credit_balances", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  balance: integer("balance").notNull().default(0),
  totalPurchased: integer("total_purchased").notNull().default(0),
  totalUsed: integer("total_used").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Credit transactions history.
 * Every credit change (purchase, usage, refund, etc.) is logged here.
 */
export const creditTransactions = pgTable(
  "credit_transactions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: transactionTypeEnum("type").notNull(),
    amount: integer("amount").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    description: text("description"),
    referenceId: text("reference_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    /**
     * Idempotency guard (code review finding: "credits not refunded /
     * double-refund risk"). One (userId, referenceId, type) triple may only
     * ever post one ledger entry - e.g. a "refund" for ai_creation id X can
     * happen exactly once for that user, no matter how many times a BullMQ
     * retry or a duplicated request tries to apply it. Keyed on userId too
     * (not just referenceId+type) because sendGift() legitimately posts two
     * rows with the *same* referenceId (the giftTransaction id) and the
     * same type ("gift") - one debiting the sender, one crediting the
     * recipient - and those two different users must not collide with each
     * other. Partial (WHERE referenceId IS NOT NULL) because plenty of
     * legitimate entries have no referenceId (manual admin adjustments,
     * signup bonus) and those must never collide under a NULL = NULL
     * comparison.
     */
    userReferenceTypeUnique: uniqueIndex("credit_transactions_user_reference_type_unique")
      .on(table.userId, table.referenceId, table.type)
      .where(sql`${table.referenceId} IS NOT NULL`),
  })
);

/**
 * Credit packages available for purchase.
 */
export const creditPackages = pgTable("credit_packages", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  name: text("name").notNull(),
  credits: integer("credits").notNull(),
  priceNis: decimal("price_nis", { precision: 10, scale: 2 }).notNull(),
  priceUsd: decimal("price_usd", { precision: 10, scale: 2 }).notNull(),
  bonusCredits: integer("bonus_credits").notNull().default(0),
  isActive: integer("is_active").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * AI creations made by users.
 * Tracks each video, music, or voice generation request.
 */
export const aiCreations = pgTable("ai_creations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: creationTypeEnum("type").notNull(),
  status: creationStatusEnum("status").notNull().default("pending"),
  creditsUsed: integer("credits_used").notNull(),
  prompt: text("prompt").notNull(),
  settings: text("settings"),
  resultUrl: text("result_url"),
  thumbnailUrl: text("thumbnail_url"),
  durationSeconds: integer("duration_seconds"),
  apiProvider: text("api_provider"),
  apiCostUsd: decimal("api_cost_usd", { precision: 10, scale: 4 }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

/**
 * Payment records for credit purchases.
 */
export const payments = pgTable("payments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  packageId: text("package_id").references(() => creditPackages.id),
  provider: text("provider").notNull(),
  providerPaymentId: text("provider_payment_id"),
  amountNis: decimal("amount_nis", { precision: 10, scale: 2 }).notNull(),
  amountUsd: decimal("amount_usd", { precision: 10, scale: 2 }),
  creditsGranted: integer("credits_granted").notNull(),
  status: text("status").notNull().default("pending"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});
