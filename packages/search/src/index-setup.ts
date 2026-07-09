import type { MeiliSearch } from "meilisearch";
import { MOVIES_INDEX_NAME } from "./client";

/**
 * Idempotent index configuration - safe to call on every deploy/startup.
 * Kept intentionally small (architecture plan §3): text + filters only.
 * Semantic (embedding) search stays in Postgres/pgvector, not Meilisearch -
 * this index is layer 1 ("text/filters") of the two-layer search design.
 */
export async function ensureMoviesIndex(client: MeiliSearch): Promise<void> {
  await client.createIndex(MOVIES_INDEX_NAME, { primaryKey: "id" });
  const index = client.index(MOVIES_INDEX_NAME);

  await index.updateSettings({
    searchableAttributes: ["title", "originalTitle", "synopsis", "genres"],
    filterableAttributes: ["genres", "year", "linkStatus", "watchSource.kind", "contentType"],
    sortableAttributes: ["year"]
  });
}
