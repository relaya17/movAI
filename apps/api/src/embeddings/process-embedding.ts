import { buildMovieEmbeddingText, embedText } from "@movai/recommendation-engine";
import { getMovieById, listMoviesMissingEmbeddings, updateMovieEmbedding, type Database } from "@movai/db";

export async function processEmbeddingJob(db: Database, movieId: string): Promise<void> {
  const movie = await getMovieById(db, movieId);
  if (!movie) return;

  const text = buildMovieEmbeddingText(movie);
  const embedding = embedText(text);
  await updateMovieEmbedding(db, movieId, embedding);
}

export async function processEmbeddingBackfill(db: Database, batchSize: number): Promise<number> {
  const missing = await listMoviesMissingEmbeddings(db, batchSize);
  for (const movie of missing) {
    const text = buildMovieEmbeddingText(movie);
    const embedding = embedText(text);
    await updateMovieEmbedding(db, movie.id, embedding);
  }
  return missing.length;
}
