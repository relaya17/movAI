import { Worker, type ConnectionOptions, type Job } from "bullmq";
import {
  QUEUE_NAMES,
  QUEUE_PREFIX,
  EmbeddingJobSchema,
  EmbeddingBackfillJobSchema,
  type EmbeddingJob,
  type EmbeddingBackfillJob
} from "../queues";

export interface CreateEmbeddingWorkerOptions {
  connection: ConnectionOptions;
  processEmbedding: (movieId: string) => Promise<void>;
  processBackfill: (batchSize: number) => Promise<number>;
}

export function createEmbeddingWorker(options: CreateEmbeddingWorkerOptions): Worker<EmbeddingJob | EmbeddingBackfillJob> {
  return new Worker<EmbeddingJob | EmbeddingBackfillJob>(
    QUEUE_NAMES.embeddings,
    async (job: Job) => {
      if (job.name === "backfill") {
        const payload = EmbeddingBackfillJobSchema.parse(job.data);
        const processed = await options.processBackfill(payload.batchSize);
        return { processed };
      }

      const payload = EmbeddingJobSchema.parse(job.data);
      await options.processEmbedding(payload.movieId);
      return { movieId: payload.movieId };
    },
    { connection: options.connection, prefix: QUEUE_PREFIX, concurrency: 4 }
  );
}
