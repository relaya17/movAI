import { diversify } from "@movai/recommendation-engine";
import type { PublicMovie } from "@movai/types";
import {
  getMovieEmbedding,
  getUserPreferences,
  listMovies,
  listMoviesWithEmbeddings,
  listWatchlistMovieIds,
  getMoviesByIds
} from "@movai/db";
import { db } from "./db";
import { listMovies as listMoviesCatalog } from "./movies";
import { getRecommendationLambda } from "./experiments";
import { trackServerEvent } from "./analytics";

/** A recommended movie plus a short, honest "why" - the transparency big streaming apps' black-box algorithms don't offer. */
export type RecommendedMovie = PublicMovie & { reason: string };

const REASON_POPULAR = "פופולרי ב-MoVAI";
const REASON_TASTE = "מבוסס על מה שצפית בו";

function withReason(movie: PublicMovie, reason: string): RecommendedMovie {
  return { ...movie, reason };
}

/**
 * Personalized (or cold-start) recommendations.
 * Prefer diversified cosine similarity over stored embeddings (MMR re-ranking,
 * not a pure nearest-neighbor list - see recommendation-engine/similarity.ts
 * for why: pure similarity ranking is the "genre silo" failure mode); fall
 * back to genre overlap when the catalog has no embeddings yet.
 */
export async function getRecommendationsForUser(userId: string | undefined, limit = 12): Promise<RecommendedMovie[]> {
  try {
    const catalog = await listMovies(db, { limit: 100, contentType: "movie" });
    if (catalog.length === 0) {
      // Empty DB: use mock catalog for cold-start genre/popular rows.
      const mocks = await listMoviesCatalog(limit * 2);
      return mocks.slice(0, limit).map((movie) => withReason(movie, REASON_POPULAR));
    }

    const seedIds = userId ? await listWatchlistMovieIds(db, userId) : [];
    const seedMovies = seedIds.length > 0 ? await getMoviesByIds(db, seedIds.slice(0, 5)) : [];

    const withEmbeddings = await listMoviesWithEmbeddings(db, 200);
    const seedEmbedding = await averageSeedEmbedding(seedMovies.map((m) => m.id));
    const lambda = await getRecommendationLambda();

    if (seedEmbedding && withEmbeddings.length > 0) {
      const candidates = new Map(withEmbeddings.filter((m) => !seedIds.includes(m.id)).map((m) => [m.id, m.embedding]));
      const ranked = diversify(seedEmbedding, candidates, limit, { lambda });
      const byId = new Map(withEmbeddings.map((m) => [m.id, m]));
      const picked = ranked.map((r) => byId.get(r.movieId)).filter((m): m is PublicMovie & { embedding: number[] } => !!m);
      if (picked.length > 0) {
        await trackServerEvent("recommendation_shown", { count: picked.length, source: "embedding" });
        return picked.map(({ embedding: _e, ...movie }) => withReason(movie, buildGenreReason(movie.genres, seedMovies)));
      }
    }

    // True cold start (no watchlist yet): fall back to the onboarding-quiz
    // genres (packages/db/src/repositories/preferences.ts) instead of a
    // blank "popular" list, if the user answered the quiz.
    const preferenceSeeds =
      seedMovies.length === 0 && userId ? await onboardingGenreSeeds(userId) : [];

    return genreOverlapRecommendations([...seedMovies, ...preferenceSeeds], catalog, seedIds, limit);
  } catch {
    const mocks = await listMoviesCatalog(limit * 2);
    return mocks.slice(0, limit).map((movie) => withReason(movie, REASON_POPULAR));
  }
}

export async function getSimilarMovies(movieId: string, genres: readonly string[], limit = 8): Promise<RecommendedMovie[]> {
  try {
    const withEmbeddings = await listMoviesWithEmbeddings(db, 200);
    const seedEmbedding = await getMovieEmbedding(db, movieId);
    const lambda = await getRecommendationLambda();

    if (seedEmbedding && withEmbeddings.length > 0) {
      const candidates = new Map(withEmbeddings.filter((m) => m.id !== movieId).map((m) => [m.id, m.embedding]));
      const ranked = diversify(seedEmbedding, candidates, limit, { lambda });
      const byId = new Map(withEmbeddings.map((m) => [m.id, m]));
      const picked = ranked.map((r) => byId.get(r.movieId)).filter((m): m is PublicMovie & { embedding: number[] } => !!m);
      if (picked.length > 0) {
        return picked.map(({ embedding: _e, ...movie }) =>
          withReason(movie, buildGenreReason(movie.genres, [{ genres: [...genres] }]))
        );
      }
    }

    const catalog = await listMovies(db, { limit: 80, contentType: "movie" });
    if (catalog.length === 0) {
      const mocks = await listMoviesCatalog(80);
      return genreOverlapRecommendations([{ id: movieId, genres: [...genres] }], mocks, [movieId], limit);
    }
    return genreOverlapRecommendations([{ id: movieId, genres: [...genres] }], catalog, [movieId], limit);
  } catch {
    const mocks = await listMoviesCatalog(80);
    return genreOverlapRecommendations([{ id: movieId, genres: [...genres] }], mocks, [movieId], limit);
  }
}

/** Best-effort human reason for an embedding-based pick: name the shared genre when there is one, otherwise a generic taste-based line. */
function buildGenreReason(movieGenres: readonly string[], seeds: readonly Pick<PublicMovie, "genres">[]): string {
  const seedGenres = new Set(seeds.flatMap((movie) => movie.genres));
  const shared = movieGenres.find((genre) => seedGenres.has(genre));
  return shared ? `כי אהבת סרטי ${shared}` : REASON_TASTE;
}

/** A synthetic "seed movie" carrying only the genres the user picked in the onboarding quiz - id is unused by genreOverlapRecommendations, only .genres is read. */
async function onboardingGenreSeeds(userId: string): Promise<Pick<PublicMovie, "id" | "genres">[]> {
  const prefs = await getUserPreferences(db, userId);
  if (!prefs || prefs.favoriteGenres.length === 0) return [];
  return [{ id: "onboarding-quiz", genres: prefs.favoriteGenres }];
}

async function averageSeedEmbedding(seedIds: readonly string[]): Promise<number[] | undefined> {
  const vectors: number[][] = [];
  for (const id of seedIds) {
    const embedding = await getMovieEmbedding(db, id);
    if (embedding && embedding.length > 0) vectors.push(embedding);
  }
  if (vectors.length === 0) return undefined;

  const dim = vectors[0]?.length ?? 0;
  const avg = new Array<number>(dim).fill(0);
  for (const vector of vectors) {
    for (let i = 0; i < dim; i += 1) {
      avg[i] = (avg[i] ?? 0) + (vector[i] ?? 0);
    }
  }
  return avg.map((value) => value / vectors.length);
}

function genreOverlapRecommendations(
  seeds: readonly Pick<PublicMovie, "id" | "genres">[],
  catalog: readonly PublicMovie[],
  excludeIds: readonly string[],
  limit: number
): RecommendedMovie[] {
  const exclude = new Set(excludeIds);
  const seedGenres = new Set(seeds.flatMap((movie) => movie.genres));

  const scored = catalog
    .filter((movie) => !exclude.has(movie.id))
    .map((movie) => ({
      movie,
      sharedGenre: movie.genres.find((genre) => seedGenres.has(genre)),
      score: movie.genres.reduce((sum, genre) => sum + (seedGenres.has(genre) ? 1 : 0), 0)
    }))
    .sort((a, b) => b.score - a.score || b.movie.year - a.movie.year);

  const withOverlap = scored
    .filter((entry) => entry.score > 0)
    .map((entry) => withReason(entry.movie, entry.sharedGenre ? `כי אהבת סרטי ${entry.sharedGenre}` : REASON_TASTE));
  if (withOverlap.length >= limit) return withOverlap.slice(0, limit);

  // Cold start: no seeds / no genre overlap - surface recent active catalog.
  const filler = scored
    .map((entry) => entry.movie)
    .filter((movie) => !withOverlap.some((m) => m.id === movie.id))
    .map((movie) => withReason(movie, REASON_POPULAR));
  return [...withOverlap, ...filler].slice(0, limit);
}
