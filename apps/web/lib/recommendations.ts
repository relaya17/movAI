import { rankBySimilarity } from "@movai/recommendation-engine";
import type { PublicMovie } from "@movai/types";
import {
  getMovieEmbedding,
  listMovies,
  listMoviesWithEmbeddings,
  listWatchlistMovieIds,
  getMoviesByIds
} from "@movai/db";
import { db } from "./db";
import { listMovies as listMoviesCatalog } from "./movies";

/**
 * Personalized (or cold-start) recommendations.
 * Prefer cosine similarity over stored embeddings; fall back to genre overlap
 * when the catalog has no embeddings yet (typical fresh local DB).
 */
export async function getRecommendationsForUser(userId: string | undefined, limit = 12): Promise<PublicMovie[]> {
  try {
    const catalog = await listMovies(db, { limit: 100, contentType: "movie" });
    if (catalog.length === 0) {
      // Empty DB: use mock catalog for cold-start genre/popular rows.
      const mocks = await listMoviesCatalog(limit * 2);
      return mocks.slice(0, limit);
    }

    const seedIds = userId ? await listWatchlistMovieIds(db, userId) : [];
    const seedMovies = seedIds.length > 0 ? await getMoviesByIds(db, seedIds.slice(0, 5)) : [];

    const withEmbeddings = await listMoviesWithEmbeddings(db, 200);
    const seedEmbedding = await averageSeedEmbedding(seedMovies.map((m) => m.id));

    if (seedEmbedding && withEmbeddings.length > 0) {
      const candidates = new Map(withEmbeddings.filter((m) => !seedIds.includes(m.id)).map((m) => [m.id, m.embedding]));
      const ranked = rankBySimilarity(seedEmbedding, candidates, limit);
      const byId = new Map(withEmbeddings.map((m) => [m.id, m]));
      const picked = ranked.map((r) => byId.get(r.movieId)).filter((m): m is PublicMovie & { embedding: number[] } => !!m);
      if (picked.length > 0) return picked.map(({ embedding: _e, ...movie }) => movie);
    }

    return genreOverlapRecommendations(seedMovies, catalog, seedIds, limit);
  } catch {
    const mocks = await listMoviesCatalog(limit * 2);
    return mocks.slice(0, limit);
  }
}

export async function getSimilarMovies(movieId: string, genres: readonly string[], limit = 8): Promise<PublicMovie[]> {
  try {
    const withEmbeddings = await listMoviesWithEmbeddings(db, 200);
    const seedEmbedding = await getMovieEmbedding(db, movieId);

    if (seedEmbedding && withEmbeddings.length > 0) {
      const candidates = new Map(withEmbeddings.filter((m) => m.id !== movieId).map((m) => [m.id, m.embedding]));
      const ranked = rankBySimilarity(seedEmbedding, candidates, limit);
      const byId = new Map(withEmbeddings.map((m) => [m.id, m]));
      const picked = ranked.map((r) => byId.get(r.movieId)).filter((m): m is PublicMovie & { embedding: number[] } => !!m);
      if (picked.length > 0) return picked.map(({ embedding: _e, ...movie }) => movie);
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
): PublicMovie[] {
  const exclude = new Set(excludeIds);
  const seedGenres = new Set(seeds.flatMap((movie) => movie.genres));

  const scored = catalog
    .filter((movie) => !exclude.has(movie.id))
    .map((movie) => ({
      movie,
      score: movie.genres.reduce((sum, genre) => sum + (seedGenres.has(genre) ? 1 : 0), 0)
    }))
    .sort((a, b) => b.score - a.score || b.movie.year - a.movie.year);

  const withOverlap = scored.filter((entry) => entry.score > 0).map((entry) => entry.movie);
  if (withOverlap.length >= limit) return withOverlap.slice(0, limit);

  // Cold start: no seeds / no genre overlap - surface recent active catalog.
  const filler = scored.map((entry) => entry.movie).filter((movie) => !withOverlap.some((m) => m.id === movie.id));
  return [...withOverlap, ...filler].slice(0, limit);
}
