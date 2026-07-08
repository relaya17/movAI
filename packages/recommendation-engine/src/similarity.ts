/**
 * Content-based recommendation core: cosine similarity over movie
 * embeddings (architecture plan §5, layer 2/4). Deliberately the first
 * piece built because it needs zero users/history to be useful - it only
 * needs the catalog itself, which solves the cold-start problem for
 * launch day (see plan §15.2 for the complementary onboarding-quiz seed).
 */
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }
  if (a.length === 0) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    magA += ai * ai;
    magB += bi * bi;
  }

  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export interface ScoredMovieId {
  movieId: string;
  score: number;
}

/**
 * Ranks candidate embeddings against a seed embedding (e.g. a movie the
 * user rated highly, or the averaged embedding from their onboarding quiz
 * answers) and returns the top `limit` matches, best first.
 */
export function rankBySimilarity(
  seedEmbedding: readonly number[],
  candidates: ReadonlyMap<string, readonly number[]>,
  limit = 20
): ScoredMovieId[] {
  const scored: ScoredMovieId[] = [];
  for (const [movieId, embedding] of candidates) {
    scored.push({ movieId, score: cosineSimilarity(seedEmbedding, embedding) });
  }
  return scored.sort((x, y) => y.score - x.score).slice(0, limit);
}
