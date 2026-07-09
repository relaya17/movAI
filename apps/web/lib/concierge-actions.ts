"use server";

import { diversify, embedText, parseConciergeQuery } from "@movai/recommendation-engine";
import type { PublicMovie } from "@movai/types";
import { listMovies, listMoviesWithEmbeddings } from "@movai/db";
import { db } from "./db";
import { trackServerEvent } from "./analytics";

export interface ConciergeResult {
  movies: PublicMovie[];
  explanation: string;
}

async function parseWithAnthropic(query: string): Promise<ReturnType<typeof parseConciergeQuery> | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: `Extract movie search filters from this query. Reply ONLY with JSON: {"genres":["drama"],"yearFrom":1960,"yearTo":1969,"keywords":["noir"]}. Query: ${query}`
          }
        ]
      })
    });

    if (!response.ok) return null;
    const data = (await response.json()) as { content?: Array<{ text?: string }> };
    const text = data.content?.[0]?.text?.trim();
    if (!text) return null;
    const parsed = JSON.parse(text) as {
      genres?: string[];
      yearFrom?: number;
      yearTo?: number;
      keywords?: string[];
    };
    return {
      genres: parsed.genres ?? [],
      yearFrom: parsed.yearFrom,
      yearTo: parsed.yearTo,
      keywords: parsed.keywords ?? []
    };
  } catch {
    return null;
  }
}

function applyFilters(
  movies: readonly PublicMovie[],
  filters: ReturnType<typeof parseConciergeQuery>
): PublicMovie[] {
  return movies.filter((movie) => {
    if (filters.yearFrom && movie.year < filters.yearFrom) return false;
    if (filters.yearTo && movie.year > filters.yearTo) return false;
    if (filters.genres.length > 0) {
      const movieGenres = movie.genres.map((genre) => genre.toLowerCase());
      const match = filters.genres.some((genre) => movieGenres.some((g) => g.includes(genre) || genre.includes(g)));
      if (!match) return false;
    }
    return true;
  });
}

/** Movie Concierge — NL query → semantic + filter ranking. */
export async function searchConciergeAction(query: string): Promise<ConciergeResult> {
  const trimmed = query.trim();
  if (!trimmed) return { movies: [], explanation: "כתבו מה אתם מחפשים" };

  const filters = (await parseWithAnthropic(trimmed)) ?? parseConciergeQuery(trimmed);
  const catalog = await listMovies(db, { limit: 200, contentType: "movie" });
  const filtered = applyFilters(catalog, filters);

  const withEmbeddings = await listMoviesWithEmbeddings(db, 200);
  const queryVector = embedText(trimmed);

  if (withEmbeddings.length > 0) {
    const pool = filtered.length > 0 ? withEmbeddings.filter((m) => filtered.some((f) => f.id === m.id)) : withEmbeddings;
    const candidates = new Map(pool.map((movie) => [movie.id, movie.embedding]));
    const ranked = diversify(queryVector, candidates, 12, { lambda: 0.35 });
    const byId = new Map(pool.map((movie) => [movie.id, movie]));
    const movies = ranked
      .map((entry) => byId.get(entry.movieId))
      .filter((movie): movie is (typeof withEmbeddings)[number] => !!movie)
      .map(({ embedding: _embedding, ...movie }) => movie);

    if (movies.length > 0) {
      const explanation = buildExplanation(filters, movies.length);
      await trackServerEvent("concierge_search", { queryLength: trimmed.length, resultCount: movies.length });
      return { movies, explanation };
    }
  }

  // Text fallback when embeddings not ready yet.
  const keywords = [...filters.keywords, ...filters.genres];
  const scored = (filtered.length > 0 ? filtered : catalog)
    .map((movie) => ({
      movie,
      score: keywords.reduce((sum, keyword) => {
        const haystack = `${movie.title} ${movie.synopsis} ${movie.genres.join(" ")}`.toLowerCase();
        return sum + (haystack.includes(keyword) ? 1 : 0);
      }, 0)
    }))
    .sort((a, b) => b.score - a.score || b.movie.year - a.movie.year);

  const movies = scored.slice(0, 12).map((entry) => entry.movie);
  const explanation = buildExplanation(filters, movies.length);
  await trackServerEvent("concierge_search", { queryLength: trimmed.length, resultCount: movies.length });
  return { movies, explanation };
}

function buildExplanation(filters: ReturnType<typeof parseConciergeQuery>, count: number): string {
  const parts: string[] = [];
  if (filters.genres.length > 0) parts.push(`ז'אנר: ${filters.genres.join(", ")}`);
  if (filters.yearFrom && filters.yearTo) parts.push(`שנים ${filters.yearFrom}–${filters.yearTo}`);
  if (parts.length === 0) return `נמצאו ${count} תוצאות לפי דמיון סמנטי`;
  return `נמצאו ${count} תוצאות · ${parts.join(" · ")}`;
}
