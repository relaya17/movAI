import { Worker, type ConnectionOptions, type Job } from "bullmq";
import type { ContentAdapter } from "@movai/content-adapters";
import type { PublicMovie } from "@movai/types";
import { QUEUE_NAMES, QUEUE_PREFIX, IngestionJobSchema, type IngestionJob } from "../queues";

export interface CreateIngestionWorkerOptions {
  connection: ConnectionOptions;
  adapters: readonly ContentAdapter[];
  /** Injected rather than importing @movai/search directly, so this package doesn't need to know about the index schema. */
  onMoviesFetched: (movies: readonly PublicMovie[]) => Promise<void>;
}

export function createIngestionWorker(options: CreateIngestionWorkerOptions): Worker<IngestionJob> {
  return new Worker<IngestionJob>(
    QUEUE_NAMES.ingestion,
    async (job: Job<IngestionJob>) => {
      const payload = IngestionJobSchema.parse(job.data);
      const adapter = options.adapters.find((candidate) => candidate.name === payload.source);
      if (!adapter) {
        throw new Error(`No content adapter registered for source "${payload.source}"`);
      }

      const movies = await adapter.search(payload.query);
      await options.onMoviesFetched(movies);
      return { indexed: movies.length };
    },
    { connection: options.connection, prefix: QUEUE_PREFIX, concurrency: 2 }
  );
}
