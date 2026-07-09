import { Worker, type ConnectionOptions, type Job } from "bullmq";
import { QUEUE_NAMES, QUEUE_PREFIX, OnboardingDripJobSchema, type OnboardingDripJob } from "../queues";

export interface CreateOnboardingWorkerOptions {
  connection: ConnectionOptions;
  processDrip: (dripDay: 3 | 7) => Promise<void>;
}

export function createOnboardingWorker(options: CreateOnboardingWorkerOptions): Worker<OnboardingDripJob> {
  return new Worker<OnboardingDripJob>(
    QUEUE_NAMES.onboarding,
    async (job: Job<OnboardingDripJob>) => {
      const payload = OnboardingDripJobSchema.parse(job.data);
      await options.processDrip(payload.dripDay);
      return { dripDay: payload.dripDay };
    },
    { connection: options.connection, prefix: QUEUE_PREFIX, concurrency: 1 }
  );
}
