import { describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import type { Database } from "../../client";
import type { PublicMovie } from "@movai/types";
import { movies } from "../../schema/catalog";
import { upsertMovie, listMovies } from "../movies";

const ARCHIVE_MOVIE: PublicMovie = {
  id: "8f14e45f-ceea-467e-9575-000000000001",
  slug: "detour-1945-archive",
  title: "Detour",
  year: 1945,
  genres: [],
  synopsis: "A hitchhiker's fateful cross-country journey.",
  contentType: "movie",
  watchSource: { kind: "archive", identifier: "detour_1945", license: "public-domain" },
  linkStatus: "active"
};

/** Shape of an existing row as it would come back from `movies` table selects. */
function existingRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "8f14e45f-ceea-467e-9575-000000000099",
    slug: "detour-1945-youtube",
    title: "Detour",
    originalTitle: null,
    year: 1945,
    genres: ["Crime"],
    synopsis: "Previously ingested via YouTube.",
    posterUrl: "https://image.tmdb.org/t/p/w500/abc.jpg",
    tmdbId: 999,
    contentType: "movie",
    watchSource: { kind: "youtube", videoId: "xyz", channelTitle: "Public Domain Films" },
    linkStatus: "active" as const,
    linkLastCheckedAt: new Date("2026-01-01T00:00:00Z"),
    classification: null,
    ...overrides
  };
}

/**
 * Fakes exactly the two query shapes upsertMovie() uses:
 *  - db.select().from(movies).where(eq(tmdbId, ...)).limit(1)  (getMovieByTmdbId)
 *  - db.insert(movies).values({...}).onConflictDoUpdate({...})
 * `selectResult` controls what getMovieByTmdbId "finds" (or doesn't).
 */
function createFakeDb(selectResult: ReturnType<typeof existingRow>[]) {
  const insertedValues: Record<string, unknown>[] = [];

  const select = vi.fn(() => ({
    from: () => ({
      where: () => ({
        limit: async () => selectResult
      })
    })
  }));

  const insert = vi.fn(() => ({
    values: (values: Record<string, unknown>) => {
      insertedValues.push(values);
      return { onConflictDoUpdate: async () => undefined };
    }
  }));

  const db = { select, insert } as unknown as Database;
  return { db, insertedValues, select };
}

describe("upsertMovie tmdbId de-duplication", () => {
  it("inserts under the movie's own id/slug when it has no tmdbId yet", async () => {
    const { db, insertedValues, select } = createFakeDb([]);

    await upsertMovie(db, ARCHIVE_MOVIE);

    // No tmdbId on the incoming movie - getMovieByTmdbId must never even be queried.
    expect(select).not.toHaveBeenCalled();
    expect(insertedValues[0]).toMatchObject({ id: ARCHIVE_MOVIE.id, slug: ARCHIVE_MOVIE.slug });
  });

  it("inserts under the movie's own id/slug when tmdbId is set but nothing matches yet", async () => {
    const withTmdbId: PublicMovie = { ...ARCHIVE_MOVIE, tmdbId: 999 };
    const { db, insertedValues } = createFakeDb([]);

    await upsertMovie(db, withTmdbId);

    expect(insertedValues[0]).toMatchObject({ id: withTmdbId.id, slug: withTmdbId.slug });
  });

  it("merges into the EXISTING row's id/slug when the same tmdbId was already ingested under a different source/slug", async () => {
    // Same underlying film, discovered again - e.g. a YouTube upload of a
    // title already ingested from Archive.org, now that TMDB enrichment
    // resolved both to tmdbId 999. Must not create a second catalog row.
    const rediscovered: PublicMovie = { ...ARCHIVE_MOVIE, tmdbId: 999 };
    const existing = existingRow({ tmdbId: 999 });
    const { db, insertedValues } = createFakeDb([existing]);

    await upsertMovie(db, rediscovered);

    expect(insertedValues[0]).toMatchObject({ id: existing.id, slug: existing.slug });
    // The new watchSource is still applied (fresh metadata refresh)...
    expect(insertedValues[0]?.watchSource).toEqual(rediscovered.watchSource);
    // ...but never under a second, newly-generated identity.
    expect(insertedValues[0]?.id).not.toBe(rediscovered.id);
    expect(insertedValues[0]?.slug).not.toBe(rediscovered.slug);
  });
});

/**
 * Fakes exactly the query shape listMovies() uses:
 * db.select().from(movies).where(...).limit(...).offset(...)
 * Captures the `where` condition so tests can assert on the actual
 * contentType being filtered on, not just that some query ran.
 */
function createFakeListDb() {
  const whereCalls: unknown[] = [];
  const select = vi.fn(() => ({
    from: () => ({
      where: (condition: unknown) => {
        whereCalls.push(condition);
        return { limit: () => ({ offset: async () => [] }) };
      }
    })
  }));
  const db = { select } as unknown as Database;
  return { db, whereCalls };
}

describe("listMovies contentType filtering", () => {
  it("defaults to contentType 'movie' when none is specified (browse-page movies category)", async () => {
    const { db, whereCalls } = createFakeListDb();

    await listMovies(db);

    expect(whereCalls[0]).toEqual(and(eq(movies.linkStatus, "active"), eq(movies.contentType, "movie")));
  });

  it("filters by an explicit contentType (standup/music/singing browse categories)", async () => {
    const { db, whereCalls } = createFakeListDb();

    await listMovies(db, { contentType: "standup" });

    expect(whereCalls[0]).toEqual(and(eq(movies.linkStatus, "active"), eq(movies.contentType, "standup")));
  });
});
