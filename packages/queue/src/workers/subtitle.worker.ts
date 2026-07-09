import { Worker, type ConnectionOptions, type Job } from "bullmq";
import { QUEUE_NAMES, QUEUE_PREFIX, SubtitleJobSchema, type SubtitleJob } from "../queues";

export interface CreateSubtitleWorkerOptions {
  connection: ConnectionOptions;
  /** Injected processor — keeps @movai/queue free of Replicate/DB deps. */
  processSubtitle: (subtitleId: string) => Promise<void>;
}

export function createSubtitleWorker(options: CreateSubtitleWorkerOptions): Worker<SubtitleJob> {
  return new Worker<SubtitleJob>(
    QUEUE_NAMES.subtitles,
    async (job: Job<SubtitleJob>) => {
      const payload = SubtitleJobSchema.parse(job.data);
      await options.processSubtitle(payload.subtitleId);
      return { subtitleId: payload.subtitleId };
    },
    { connection: options.connection, prefix: QUEUE_PREFIX, concurrency: 2 }
  );
}
