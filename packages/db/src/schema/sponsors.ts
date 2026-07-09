import { randomUUID } from "node:crypto";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Manually-curated sponsor banners (the "ads" free/non-subscriber users see)
 * - deliberately NOT an automated ad-network integration (AdSense etc.).
 * Every row here was added by hand through the admin panel
 * (apps/web/app/(dashboard)/admin/sponsors), so there is never any
 * third-party ad content this app doesn't have direct, reviewed control
 * over. Subscribers with `subscriptionPlans.adFree` never see these (see
 * apps/web/components/dashboard/SponsorBanner.tsx).
 */
export const sponsors = pgTable("sponsors", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  name: text("name").notNull(),
  imageUrl: text("image_url").notNull(),
  linkUrl: text("link_url").notNull(),
  isActive: integer("is_active").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});
