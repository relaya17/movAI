import { Worker, type ConnectionOptions, type Job } from "bullmq";
import { QUEUE_NAMES, QUEUE_PREFIX, DubbingJobSchema, type DubbingJob } from "../queues";

export interface CreateDubbingWorkerOptions {
  connection: ConnectionOptions;
  processDubbing: (jobId: string) => Promise<void>;
}

export function createDubbingWorker(options: CreateDubbingWorkerOptions): Worker<DubbingJob> {
  return new Worker<DubbingJob>(
    QUEUE_NAMES.dubbing,
    async (job: Job<DubbingJob>) => {
      const payload = DubbingJobSchema.parse(job.data);
      await options.processDubbing(payload.jobId);
      return { jobId: payload.jobId };
    },
    { connection: options.connection, prefix: QUEUE_PREFIX, concurrency: 1 }
  );
}
