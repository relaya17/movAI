import { eq } from "drizzle-orm";
import type { Database } from "../client";
import { userPreferences } from "../schema/social";

/**
 * Onboarding-quiz seed for the cold-start recommender (architecture plan
 * §15.2 - see the doc comment on userPreferences in schema/social.ts). A
 * brand-new user has no watchlist yet, so getRecommendationsForUser
 * (apps/web/lib/recommendations.ts) falls back to these self-reported
 * genres instead of a generic "popular" row.
 */
export async function getUserPreferences(db: Database, userId: string) {
  const [row] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  return row;
}

export async function saveOnboardingGenres(db: Database, userId: string, favoriteGenres: readonly string[]) {
  const [row] = await db
    .insert(userPreferences)
    .values({ userId, favoriteGenres: [...favoriteGenres] })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { favoriteGenres: [...favoriteGenres] }
    })
    .returning();
  return row;
}
