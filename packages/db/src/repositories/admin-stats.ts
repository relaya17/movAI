import { count, eq, gte } from "drizzle-orm";
import type { Database } from "../client";
import { users } from "../schema/auth";
import { movies } from "../schema/catalog";
import { uploads, giftTransactions } from "../schema/creator";
import { userSubscriptions } from "../schema/subscriptions";

/**
 * "Basic self-hosted analytics" - a single-operator startup doesn't need a
 * third-party analytics account (and the extra data-sharing that implies,
 * a real consideration given the legal caution already baked into this
 * project) to answer "is this working?". These are plain COUNTs over
 * tables that already exist, not a new event-tracking pipeline - cheap,
 * private, and immediately useful. See apps/web/app/(dashboard)/admin/stats.
 */
export interface AdminStats {
  totalUsers: number;
  totalMovies: number;
  totalUploads: number;
  publishedUploads: number;
  newUploadsLast7Days: number;
  activeSubscriptions: number;
  giftsSentLast30Days: number;
}

/**
 * users has no createdAt column (schema/auth.ts, an Auth.js-managed table
 * kept close to the adapter's expected shape) - "new uploads" is used as the
 * week-over-week activity signal instead of "new users".
 */
export async function getAdminStats(db: Database): Promise<AdminStats> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    [totalUsersRow],
    [totalMoviesRow],
    [totalUploadsRow],
    [publishedUploadsRow],
    [newUploadsRow],
    [activeSubsRow],
    [giftsRow]
  ] = await Promise.all([
    db.select({ n: count() }).from(users),
    db.select({ n: count() }).from(movies),
    db.select({ n: count() }).from(uploads),
    db.select({ n: count() }).from(uploads).where(eq(uploads.status, "published")),
    db.select({ n: count() }).from(uploads).where(gte(uploads.createdAt, sevenDaysAgo)),
    db.select({ n: count() }).from(userSubscriptions).where(eq(userSubscriptions.status, "active")),
    db.select({ n: count() }).from(giftTransactions).where(gte(giftTransactions.createdAt, thirtyDaysAgo))
  ]);

  return {
    totalUsers: totalUsersRow?.n ?? 0,
    totalMovies: totalMoviesRow?.n ?? 0,
    totalUploads: totalUploadsRow?.n ?? 0,
    publishedUploads: publishedUploadsRow?.n ?? 0,
    newUploadsLast7Days: newUploadsRow?.n ?? 0,
    activeSubscriptions: activeSubsRow?.n ?? 0,
    giftsSentLast30Days: giftsRow?.n ?? 0
  };
}

/** Catalog breakdown by contentType - which category actually has content vs is still empty. */
export async function getContentTypeBreakdown(db: Database): Promise<{ contentType: string; count: number }[]> {
  const rows = await db
    .select({ contentType: movies.contentType, n: count() })
    .from(movies)
    .groupBy(movies.contentType);
  return rows.map((row) => ({ contentType: row.contentType, count: row.n }));
}
