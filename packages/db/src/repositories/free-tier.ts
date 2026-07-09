import { and, eq, gte, sql } from "drizzle-orm";
import type { Database } from "../client";
import { aiCreations } from "../schema/index";
import { MONTHLY_FREE_CREATIONS } from "@movai/types";

function startOfCurrentMonthUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** How many AI creations the user started this calendar month (UTC). */
export async function countCreationsThisMonth(db: Database, userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(aiCreations)
    .where(and(eq(aiCreations.userId, userId), gte(aiCreations.createdAt, startOfCurrentMonthUtc())));

  return row?.count ?? 0;
}

/** Remaining free creations before credits are charged. */
export async function getFreeCreationsRemaining(db: Database, userId: string): Promise<number> {
  const used = await countCreationsThisMonth(db, userId);
  return Math.max(0, MONTHLY_FREE_CREATIONS - used);
}
