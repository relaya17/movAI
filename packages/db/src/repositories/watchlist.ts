import { and, desc, eq } from "drizzle-orm";
import type { PublicMovie } from "@movai/types";
import type { Database } from "../client";
import { movies } from "../schema/catalog";
import { watchlistItems } from "../schema/social";

type MovieRow = typeof movies.$inferSelect;

function rowToPublicMovie(row: MovieRow): PublicMovie {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    originalTitle: row.originalTitle ?? undefined,
    year: row.year,
    genres: row.genres,
    synopsis: row.synopsis,
    posterUrl: row.posterUrl ?? undefined,
    tmdbId: row.tmdbId ?? undefined,
    contentType: row.contentType,
    watchSource: row.watchSource,
    linkStatus: row.linkStatus,
    linkLastCheckedAt: row.linkLastCheckedAt ? row.linkLastCheckedAt.toISOString() : undefined,
    classification: row.classification ?? undefined
  };
}

/** Newest-first watchlist for a user, joined to catalog rows. */
export async function listWatchlist(db: Database, userId: string): Promise<PublicMovie[]> {
  const rows = await db
    .select({ movie: movies })
    .from(watchlistItems)
    .innerJoin(movies, eq(watchlistItems.movieId, movies.id))
    .where(eq(watchlistItems.userId, userId))
    .orderBy(desc(watchlistItems.addedAt));

  return rows.map((row) => rowToPublicMovie(row.movie));
}

export async function isInWatchlist(db: Database, userId: string, movieId: string): Promise<boolean> {
  const [row] = await db
    .select({ movieId: watchlistItems.movieId })
    .from(watchlistItems)
    .where(and(eq(watchlistItems.userId, userId), eq(watchlistItems.movieId, movieId)))
    .limit(1);
  return row !== undefined;
}

export async function addToWatchlist(db: Database, userId: string, movieId: string): Promise<void> {
  await db
    .insert(watchlistItems)
    .values({ userId, movieId })
    .onConflictDoNothing({ target: [watchlistItems.userId, watchlistItems.movieId] });
}

export async function removeFromWatchlist(db: Database, userId: string, movieId: string): Promise<void> {
  await db
    .delete(watchlistItems)
    .where(and(eq(watchlistItems.userId, userId), eq(watchlistItems.movieId, movieId)));
}

/** Movie ids currently on the user's watchlist - used as recommendation seeds. */
export async function listWatchlistMovieIds(db: Database, userId: string): Promise<string[]> {
  const rows = await db
    .select({ movieId: watchlistItems.movieId })
    .from(watchlistItems)
    .where(eq(watchlistItems.userId, userId))
    .orderBy(desc(watchlistItems.addedAt));
  return rows.map((row) => row.movieId);
}
