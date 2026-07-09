import { and, eq, inArray, isNull, lt, or } from "drizzle-orm";
import type { PublicMovie, MovieLinkStatus, ContentType } from "@movai/types";
import type { Database } from "../client";
import { movies } from "../schema/catalog";

/**
 * Insert-or-update by slug. On conflict, the row's `id` and `createdAt` are
 * deliberately never overwritten - other tables (watchlist_items, ratings)
 * hold foreign keys to `movies.id`, so re-ingesting the same movie must
 * never change its identity, only refresh its metadata.
 *
 * Also de-duplicates by `tmdbId` when present: the same underlying film can
 * be discovered twice under different slugs (e.g. an Archive.org identifier
 * vs. a YouTube video id for the same public-domain title, or the same
 * Archive.org item resurfacing under a different daily search query). When
 * a row already exists for that tmdbId, this merges the new data into that
 * *existing* row instead of creating a second catalog entry for one film.
 */
export async function upsertMovie(db: Database, movie: PublicMovie): Promise<void> {
  const existingByTmdbId = movie.tmdbId ? await getMovieByTmdbId(db, movie.tmdbId) : undefined;
  const targetId = existingByTmdbId?.id ?? movie.id;
  const targetSlug = existingByTmdbId?.slug ?? movie.slug;

  await db
    .insert(movies)
    .values({
      id: targetId,
      slug: targetSlug,
      title: movie.title,
      originalTitle: movie.originalTitle ?? null,
      year: movie.year,
      genres: movie.genres,
      synopsis: movie.synopsis,
      posterUrl: movie.posterUrl ?? null,
      tmdbId: movie.tmdbId ?? null,
      contentType: movie.contentType,
      watchSource: movie.watchSource,
      linkStatus: movie.linkStatus,
      linkLastCheckedAt: movie.linkLastCheckedAt ? new Date(movie.linkLastCheckedAt) : null,
      classification: movie.classification ?? null
    })
    .onConflictDoUpdate({
      target: movies.slug,
      set: {
        title: movie.title,
        originalTitle: movie.originalTitle ?? null,
        year: movie.year,
        genres: movie.genres,
        synopsis: movie.synopsis,
        posterUrl: movie.posterUrl ?? null,
        tmdbId: movie.tmdbId ?? null,
        contentType: movie.contentType,
        watchSource: movie.watchSource,
        updatedAt: new Date()
      }
    });
}

export async function getMovieByTmdbId(db: Database, tmdbId: number): Promise<PublicMovie | undefined> {
  const [row] = await db.select().from(movies).where(eq(movies.tmdbId, tmdbId)).limit(1);
  return row ? rowToPublicMovie(row) : undefined;
}

/**
 * Powers the daily link-rot job (architecture plan §12.6). A movie is due
 * either because it has never been checked, or because its last check is
 * older than `olderThanDays`.
 */
export async function getMoviesDueForLinkCheck(
  db: Database,
  olderThanDays: number,
  batchSize: number
): Promise<PublicMovie[]> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

  const rows = await db
    .select()
    .from(movies)
    .where(or(isNull(movies.linkLastCheckedAt), lt(movies.linkLastCheckedAt, cutoff)))
    .limit(batchSize);

  return rows.map(rowToPublicMovie);
}

export async function updateMovieLinkStatus(
  db: Database,
  movieId: string,
  status: MovieLinkStatus,
  checkedAt: Date
): Promise<void> {
  await db.update(movies).set({ linkStatus: status, linkLastCheckedAt: checkedAt }).where(eq(movies.id, movieId));
}

export async function getMovieBySlug(db: Database, slug: string): Promise<PublicMovie | undefined> {
  const [row] = await db.select().from(movies).where(eq(movies.slug, slug)).limit(1);
  return row ? rowToPublicMovie(row) : undefined;
}

/** Internal lookups (subtitle/dubbing workers) — includes non-active catalog rows. */
export async function getMovieById(db: Database, id: string): Promise<PublicMovie | undefined> {
  const [row] = await db.select().from(movies).where(eq(movies.id, id)).limit(1);
  return row ? rowToPublicMovie(row) : undefined;
}

export interface ListMoviesOptions {
  limit?: number;
  offset?: number;
  /** Defaults to "movie" - pass "standup"/"music"/"singing" to list those browse categories instead. */
  contentType?: ContentType;
}

export async function listMovies(db: Database, options: ListMoviesOptions = {}): Promise<PublicMovie[]> {
  const rows = await db
    .select()
    .from(movies)
    .where(and(eq(movies.linkStatus, "active"), eq(movies.contentType, options.contentType ?? "movie")))
    .limit(options.limit ?? 50)
    .offset(options.offset ?? 0);

  return rows.map(rowToPublicMovie);
}

/** Catalog rows that have a stored embedding - for content-based recommendations. */
export async function listMoviesWithEmbeddings(
  db: Database,
  limit = 200
): Promise<Array<PublicMovie & { embedding: number[] }>> {
  const rows = await db
    .select()
    .from(movies)
    .where(and(eq(movies.linkStatus, "active"), eq(movies.contentType, "movie")))
    .limit(limit);

  return rows
    .filter((row): row is MovieRow & { embedding: number[] } => Array.isArray(row.embedding) && row.embedding.length > 0)
    .map((row) => ({ ...rowToPublicMovie(row), embedding: row.embedding }));
}

export async function getMovieEmbedding(db: Database, movieId: string): Promise<number[] | undefined> {
  const [row] = await db.select({ embedding: movies.embedding }).from(movies).where(eq(movies.id, movieId)).limit(1);
  return row?.embedding ?? undefined;
}

export async function getMoviesByIds(db: Database, ids: readonly string[]): Promise<PublicMovie[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select()
    .from(movies)
    .where(and(eq(movies.linkStatus, "active"), inArray(movies.id, [...ids])));
  return rows.map(rowToPublicMovie);
}

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
