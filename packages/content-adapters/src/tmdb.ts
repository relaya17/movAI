import { z } from "zod";
import type { PublicMovie } from "@movai/types";
import { CircuitBreaker } from "./resilience";

/**
 * TMDB is a metadata-only source (architecture plan §1.1) - it has no
 * legally embeddable watch source of its own, unlike the Archive/YouTube
 * adapters. So this is deliberately NOT a ContentAdapter: it doesn't
 * `search()` for new movies, it `enrich()`es a movie another adapter already
 * found, filling in the fields TMDB is actually good at (real genre names,
 * a poster, a cleaner synopsis, and a stable tmdbId used for de-duplication
 * across sources - see packages/db/src/repositories/movies.ts).
 */

const TMDB_SEARCH_RESPONSE_SCHEMA = z.object({
  results: z.array(
    z.object({
      id: z.number().int().positive(),
      title: z.string(),
      overview: z.string().optional().default(""),
      poster_path: z.string().nullable().optional(),
      release_date: z.string().optional().default(""),
      genre_ids: z.array(z.number()).optional().default([])
    })
  )
});

const TMDB_GENRE_LIST_RESPONSE_SCHEMA = z.object({
  genres: z.array(z.object({ id: z.number(), name: z.string() }))
});

export interface TmdbEnricherOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
}

export interface TmdbEnricher {
  readonly name: "tmdb";
  /** Best-effort - on any failure (rate limit, network, no match) returns `movie` unchanged rather than throwing. */
  enrich(movie: PublicMovie): Promise<PublicMovie>;
}

export function createTmdbEnricher(options: TmdbEnricherOptions): TmdbEnricher {
  const fetchImpl = options.fetchImpl ?? fetch;
  const breaker = new CircuitBreaker("tmdb");

  // Fetched lazily and cached for the lifetime of this enricher instance -
  // TMDB's genre list changes rarely enough that one fetch per process
  // (not per movie) is the right tradeoff.
  let genreMapPromise: Promise<Map<number, string>> | null = null;
  function getGenreMap(): Promise<Map<number, string>> {
    genreMapPromise ??= (async () => {
      try {
        const response = await fetchImpl(
          `https://api.themoviedb.org/3/genre/movie/list?api_key=${options.apiKey}&language=en-US`
        );
        if (!response.ok) return new Map();
        const raw: unknown = await response.json();
        const parsed = TMDB_GENRE_LIST_RESPONSE_SCHEMA.parse(raw);
        return new Map(parsed.genres.map((g) => [g.id, g.name]));
      } catch {
        return new Map();
      }
    })();
    return genreMapPromise;
  }

  return {
    name: "tmdb",

    async enrich(movie: PublicMovie): Promise<PublicMovie> {
      return breaker.execute(
        async () => {
          const url = new URL("https://api.themoviedb.org/3/search/movie");
          url.searchParams.set("api_key", options.apiKey);
          url.searchParams.set("query", movie.title);
          if (movie.year) {
            url.searchParams.set("year", String(movie.year));
          }

          const response = await fetchImpl(url.toString());
          if (!response.ok) {
            throw new Error(`TMDB API responded with ${response.status}`);
          }

          const raw: unknown = await response.json();
          const parsed = TMDB_SEARCH_RESPONSE_SCHEMA.parse(raw);
          const match = parsed.results[0];
          if (!match) {
            return movie;
          }

          const genreMap = await getGenreMap();
          const genres = match.genre_ids.map((id) => genreMap.get(id)).filter((g): g is string => Boolean(g));

          return {
            ...movie,
            tmdbId: match.id,
            genres: genres.length > 0 ? genres : movie.genres,
            synopsis: match.overview.trim().length > 0 ? match.overview : movie.synopsis,
            posterUrl: match.poster_path ? `https://image.tmdb.org/t/p/w500${match.poster_path}` : movie.posterUrl
          };
        },
        () => movie // fallback: enrichment is a nice-to-have, never blocks ingestion
      );
    }
  };
}
