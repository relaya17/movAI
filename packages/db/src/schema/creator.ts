import { integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";

/**
 * User-uploaded Studio content (raw video files: standup/music/singing) -
 * distinct from both `movies` (schema/catalog.ts, the curated legal
 * catalog) and `aiCreations` (schema/credits.ts, AI-*generated* content).
 * This table is for a creator's own recorded material, uploaded as a file
 * rather than produced from a prompt.
 */
export const uploadStatusEnum = pgEnum("upload_status", ["processing", "published", "rejected"]);
export const uploadContentTypeEnum = pgEnum("upload_content_type", ["standup", "music", "singing"]);

export const uploads = pgTable("uploads", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorUserId: text("creator_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  contentType: uploadContentTypeEnum("content_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  /** Set once the storage adapter (lib/media-storage.ts) finishes the upload - null while status is "processing". */
  videoUrl: text("video_url"),
  thumbnailUrl: text("thumbnail_url"),
  giftsEnabled: integer("gifts_enabled").notNull().default(1), // 0/1, matches the existing isActive-style boolean-as-integer convention in schema/credits.ts
  status: uploadStatusEnum("status").notNull().default("processing"),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow()
});

/**
 * Small, rarely-changing reference catalog of gift types (like TikTok's
 * Rose/Heart/Lion tiers) - not user data, seeded once via a script.
 */
export const giftCatalog = pgTable("gift_catalog", {
  id: text("id").primaryKey(), // short stable slug, e.g. "rose" - safe to hardcode in UI without an extra join
  name: text("name").notNull(),
  emoji: text("emoji").notNull(),
  costInCredits: integer("cost_in_credits").notNull(),
  sortOrder: integer("sort_order").notNull().default(0)
});

/**
 * One row per gift actually sent. Debiting the sender and crediting the
 * recipient both go through the *existing* creditTransactions ledger
 * (schema/credits.ts, type "gift") inside one DB transaction - see
 * lib/gifts.ts. creditsSpent/creditsToCreator are denormalized from
 * giftCatalog.costInCredits *at send time* so a later price change never
 * rewrites history, same reasoning as storing a price snapshot on an order
 * line item rather than re-joining a live product table.
 */
export const giftTransactions = pgTable("gift_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderId: text("sender_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  recipientId: text("recipient_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  uploadId: uuid("upload_id")
    .notNull()
    .references(() => uploads.id, { onDelete: "cascade" }),
  giftId: text("gift_id")
    .notNull()
    .references(() => giftCatalog.id),
  creditsSpent: integer("credits_spent").notNull(),
  /** Standard creator cut, matching the industry-standard ~50% take rate (architecture plan §14 monetization) - see lib/gifts.ts CREATOR_PAYOUT_RATE. */
  creditsToCreator: integer("credits_to_creator").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow()
});
