import type { MeiliSearch } from "meilisearch";
import type { PublicMovie } from "@movai/types";
import { MOVIES_INDEX_NAME } from "./client";

/** Upserts movies into the search index. Called from the ingestion queue (@movai/queue) after each adapter run. */
export async function indexMovies(client: MeiliSearch, movies: readonly PublicMovie[]): Promise<void> {
  if (movies.length === 0) return;
  await client.index(MOVIES_INDEX_NAME).addDocuments([...movies]);
}

export async function removeMovieFromIndex(client: MeiliSearch, movieId: string): Promise<void> {
  await client.index(MOVIES_INDEX_NAME).deleteDocument(movieId);
}
