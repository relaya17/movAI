import type { Queue } from "bullmq";
import type { IngestionJob } from "./queues";

/**
 * Seed queries for the automatic daily catalog sweep (architecture plan
 * §1.1 - "catalog stays populated without manual operator intervention").
 * `/admin/ingest` (apps/api/src/admin/admin.controller.ts) still exists for
 * one-off manual ingests, but without *some* list of queries running on a
 * schedule the catalog never grows on its own - this is that list. Kept
 * broad/generic (genres, eras, formats) rather than specific titles so it
 * surfaces a wide slice of each adapter's public-domain/licensed catalog
 * over time instead of hammering one narrow query every day.
 */
export interface CatalogQuerySeed {
  source: IngestionJob["source"];
  query: string;
}

export const DAILY_INGESTION_QUERIES: readonly CatalogQuerySeed[] = [
  { source: "archive", query: "comedy" },
  { source: "archive", query: "drama" },
  { source: "archive", query: "horror" },
  { source: "archive", query: "science fiction" },
  { source: "archive", query: "western" },
  { source: "archive", query: "film noir" },
  { source: "archive", query: "silent film" },
  { source: "archive", query: "documentary" },
  { source: "archive", query: "animation" },
  { source: "archive", query: "adventure" },
  { source: "archive", query: "musical" },
  { source: "archive", query: "mystery" },
  { source: "youtube", query: "public domain movie" },
  { source: "youtube", query: "classic film full movie" }
];

/**
 * Schedules one repeatable BullMQ job per seed query, all firing at the same
 * low-traffic hour. `onlySources` restricts this to adapters the caller
 * actually has configured (e.g. skip "youtube" entries when no
 * YOUTUBE_API_KEY is set) - scheduling a job for a source with no matching
 * adapter would just fail every day for no reason.
 */
export async function scheduleDailyIngestion(
  queue: Queue<IngestionJob>,
  onlySources: readonly IngestionJob["source"][]
): Promise<void> {
  const seeds = DAILY_INGESTION_QUERIES.filter((seed) => onlySources.includes(seed.source));

  for (const seed of seeds) {
    const jobId = `daily-ingest-${seed.source}-${slugify(seed.query)}`;
    await queue.add(
      "daily-catalog-sweep",
      { source: seed.source, query: seed.query },
      { repeat: { pattern: "0 2 * * *" }, jobId } // 02:00 server time, ahead of the 03:00 link-check
    );
  }
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
