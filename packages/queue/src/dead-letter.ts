import type { Job, Queue, Worker } from "bullmq";
import type { DeadLetterJob } from "./queues";

/**
 * Wires a worker's `failed` event so that once BullMQ has exhausted all
 * retries for a job (architecture plan §12.3), the job is recorded in the
 * dead-letter queue instead of just vanishing into the logs.
 *
 * `onDeadLettered` is the actual alerting hook (review finding:
 * "dead-letter queue exists but nothing alerts on it") - previously a job
 * could land here and nobody would know until someone thought to go look at
 * the queue. Kept as an injected callback rather than importing a Sentry
 * SDK directly, so this package stays dependency-free and testable without
 * one - apps/api wires it to its own alerting helper (see
 * apps/api/src/monitoring/alerting.ts).
 */
export function attachDeadLetterRouting(
  worker: Worker,
  deadLetterQueue: Queue<DeadLetterJob>,
  originalQueueName: string,
  onDeadLettered?: (entry: DeadLetterJob) => void
): void {
  worker.on("failed", (job: Job | undefined, error: Error) => {
    if (!job) return;

    const attempts = job.opts.attempts ?? 1;
    const isFinalAttempt = job.attemptsMade >= attempts;
    if (!isFinalAttempt) return; // still has retries left - not dead yet

    const entry: DeadLetterJob = {
      originalQueue: originalQueueName,
      originalJobId: job.id ?? "unknown",
      failedReason: error.message,
      data: job.data as unknown
    };

    void deadLetterQueue.add("dead-letter", entry);
    onDeadLettered?.(entry);
  });
}
