import { describe, expect, it, vi } from "vitest";
import type { PublicMovie } from "@movai/types";
import { createTmdbEnricher } from "../tmdb";

const BASE_MOVIE: PublicMovie = {
  id: "8f14e45f-ceea-467e-9575-000000000001",
  slug: "detour-1945",
  title: "Detour",
  year: 1945,
  genres: [],
  synopsis: "Detour",
  contentType: "movie",
  watchSource: { kind: "archive", identifier: "detour_1945", license: "public-domain" },
  linkStatus: "unchecked"
};

function fetchReturning(searchBody: unknown, genreBody: unknown) {
  return vi.fn(async (url: string | URL) => {
    const isGenreList = url.toString().includes("/genre/movie/list");
    return {
      ok: true,
      json: async () => (isGenreList ? genreBody : searchBody)
    } as Response;
  });
}

describe("createTmdbEnricher", () => {
  it("fills in tmdbId, real genre names, synopsis and poster on a match", async () => {
    const fetchImpl = fetchReturning(
      {
        results: [
          {
            id: 12345,
            title: "Detour",
            overview: "A hitchhiker's fateful cross-country journey.",
            poster_path: "/abc.jpg",
            release_date: "1945-11-30",
            genre_ids: [80, 18]
          }
        ]
      },
      { genres: [{ id: 80, name: "Crime" }, { id: 18, name: "Drama" }] }
    );

    const enricher = createTmdbEnricher({ apiKey: "test-key", fetchImpl });
    const enriched = await enricher.enrich(BASE_MOVIE);

    expect(enriched.tmdbId).toBe(12345);
    expect(enriched.genres).toEqual(["Crime", "Drama"]);
    expect(enriched.synopsis).toBe("A hitchhiker's fateful cross-country journey.");
    expect(enriched.posterUrl).toBe("https://image.tmdb.org/t/p/w500/abc.jpg");
    // Fields the enricher must never touch:
    expect(enriched.slug).toBe(BASE_MOVIE.slug);
    expect(enriched.watchSource).toEqual(BASE_MOVIE.watchSource);
  });

  it("returns the movie unchanged when TMDB has no matching result", async () => {
    const fetchImpl = fetchReturning({ results: [] }, { genres: [] });
    const enricher = createTmdbEnricher({ apiKey: "test-key", fetchImpl });

    const result = await enricher.enrich(BASE_MOVIE);

    expect(result).toEqual(BASE_MOVIE);
  });

  it("keeps the original genres when none of TMDB's genre ids are recognized", async () => {
    const withGenres: PublicMovie = { ...BASE_MOVIE, genres: ["Noir"] };
    const fetchImpl = fetchReturning(
      { results: [{ id: 1, title: "Detour", overview: "", poster_path: null, release_date: "1945-01-01", genre_ids: [999] }] },
      { genres: [] }
    );
    const enricher = createTmdbEnricher({ apiKey: "test-key", fetchImpl });

    const result = await enricher.enrich(withGenres);

    expect(result.genres).toEqual(["Noir"]);
    expect(result.posterUrl).toBeUndefined();
  });

  it("degrades to returning the movie unchanged (never throws) when the TMDB API is unreachable", async () => {
    vi.useFakeTimers();
    try {
      const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));
      const enricher = createTmdbEnricher({ apiKey: "test-key", fetchImpl });

      const resultPromise = enricher.enrich(BASE_MOVIE);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toEqual(BASE_MOVIE);
    } finally {
      vi.useRealTimers();
    }
  });

  it("only fetches the genre list once across multiple enrich() calls", async () => {
    const fetchImpl = fetchReturning(
      { results: [{ id: 1, title: "Detour", overview: "x", poster_path: null, release_date: "1945-01-01", genre_ids: [80] }] },
      { genres: [{ id: 80, name: "Crime" }] }
    );
    const enricher = createTmdbEnricher({ apiKey: "test-key", fetchImpl });

    await enricher.enrich(BASE_MOVIE);
    await enricher.enrich(BASE_MOVIE);

    const genreListCalls = fetchImpl.mock.calls.filter(([url]) => url.toString().includes("/genre/movie/list"));
    expect(genreListCalls).toHaveLength(1);
  });
});
