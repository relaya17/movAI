import type { Job, Queue, Worker } from "bullmq";
import type { DeadLetterJob } from "./queues";

/**
 * Wires a worker's `failed` event so that once BullMQ has exhausted all
 * retries for a job (architecture plan §12.3), the job is recorded in the
 * dead-letter queue instead of just vanishing into the logs. Alerting
 * (Sentry, in production) hooks off the dead-letter queue's own `added`
 * event, kept out of this function so it stays testable without a real
 * Sentry SDK.
 */
export function attachDeadLetterRouting(
  worker: Worker,
  deadLetterQueue: Queue<DeadLetterJob>,
  originalQueueName: string
): void {
  worker.on("failed", (job: Job | undefined, error: Error) => {
    if (!job) return;

    const attempts = job.opts.attempts ?? 1;
    const isFinalAttempt = job.attemptsMade >= attempts;
    if (!isFinalAttempt) return; // still has retries left - not dead yet

    void deadLetterQueue.add("dead-letter", {
      originalQueue: originalQueueName,
      originalJobId: job.id ?? "unknown",
      failedReason: error.message,
      data: job.data as unknown
    });
  });
}
