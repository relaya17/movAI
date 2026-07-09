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

export interface DiversifyOptions {
  /**
   * 1 = pure relevance (identical to rankBySimilarity), 0 = pure diversity.
   * Default leans toward relevance while still refusing to fill the whole
   * list from one tight cluster - this is the "genre silo" fix: big
   * streaming apps rank by pure similarity and end up feeding users an
   * increasingly narrow slice of what they already watch.
   */
  lambda?: number;
}

/**
 * Maximal Marginal Relevance re-ranking: greedily picks the next candidate
 * that balances relevance to the seed against similarity to items already
 * picked, so the result isn't just the single nearest cluster. O(limit * n),
 * fine for the ~200-candidate pools used here.
 */
export function diversify(
  seedEmbedding: readonly number[],
  candidates: ReadonlyMap<string, readonly number[]>,
  limit = 20,
  options: DiversifyOptions = {}
): ScoredMovieId[] {
  const lambda = options.lambda ?? 0.75;
  const pool = new Map(candidates);
  const picked: ScoredMovieId[] = [];
  const pickedEmbeddings: (readonly number[])[] = [];

  while (picked.length < limit && pool.size > 0) {
    let bestId: string | undefined;
    let bestEmbedding: readonly number[] | undefined;
    let bestScore = -Infinity;

    for (const [id, embedding] of pool) {
      const relevance = cosineSimilarity(seedEmbedding, embedding);
      const maxSimToPicked =
        pickedEmbeddings.length === 0
          ? 0
          : Math.max(...pickedEmbeddings.map((pickedEmbedding) => cosineSimilarity(embedding, pickedEmbedding)));
      const mmrScore = lambda * relevance - (1 - lambda) * maxSimToPicked;
      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestId = id;
        bestEmbedding = embedding;
      }
    }

    if (bestId === undefined || bestEmbedding === undefined) break;
    picked.push({ movieId: bestId, score: cosineSimilarity(seedEmbedding, bestEmbedding) });
    pickedEmbeddings.push(bestEmbedding);
    pool.delete(bestId);
  }

  return picked;
}
