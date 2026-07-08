import { Queue, type ConnectionOptions } from "bullmq";
import { z } from "zod";

/**
 * BullMQ builds Redis keys as `{prefix}:{queueName}:...` internally, so a
 * colon inside the queue name itself collides with that scheme and BullMQ
 * throws ("Queue name cannot contain :") the moment a Queue is constructed.
 * The "movai:" namespacing is expressed via the `prefix` option below
 * instead - same Redis key layout (movai:ingestion:...), without breaking
 * queue construction.
 */
export const QUEUE_PREFIX = "movai";

export const QUEUE_NAMES = {
  ingestion: "ingestion",
  linkCheck: "link-check",
  deadLetter: "dead-letter"
} as const;

export const IngestionJobSchema = z.object({
  source: z.enum(["youtube", "archive"]),
  query: z.string().min(1)
});
export type IngestionJob = z.infer<typeof IngestionJobSchema>;

export const LinkCheckJobSchema = z.object({
  /** Only re-check movies whose linkLastCheckedAt is older than this, in days (architecture plan §12.6). */
  olderThanDays: z.number().int().positive().default(7),
  batchSize: z.number().int().positive().max(500).default(100)
});
export type LinkCheckJob = z.infer<typeof LinkCheckJobSchema>;

export const DeadLetterJobSchema = z.object({
  originalQueue: z.string(),
  originalJobId: z.string(),
  failedReason: z.string(),
  data: z.unknown()
});
export type DeadLetterJob = z.infer<typeof DeadLetterJobSchema>;

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 2_000 }
};

export function createIngestionQueue(connection: ConnectionOptions): Queue<IngestionJob> {
  return new Queue<IngestionJob>(QUEUE_NAMES.ingestion, {
    connection,
    prefix: QUEUE_PREFIX,
    defaultJobOptions: DEFAULT_JOB_OPTIONS
  });
}

export function createLinkCheckQueue(connection: ConnectionOptions): Queue<LinkCheckJob> {
  return new Queue<LinkCheckJob>(QUEUE_NAMES.linkCheck, {
    connection,
    prefix: QUEUE_PREFIX,
    defaultJobOptions: DEFAULT_JOB_OPTIONS
  });
}

export function createDeadLetterQueue(connection: ConnectionOptions): Queue<DeadLetterJob> {
  // No retries here on purpose - a dead-letter entry is already the "final attempt failed" record.
  return new Queue<DeadLetterJob>(QUEUE_NAMES.deadLetter, { connection, prefix: QUEUE_PREFIX });
}

/** Schedules the daily link-rot check (architecture plan §12.6) as a repeatable job. */
export async function scheduleDailyLinkCheck(queue: Queue<LinkCheckJob>): Promise<void> {
  await queue.add(
    "daily-link-check",
    { olderThanDays: 7, batchSize: 100 },
    { repeat: { pattern: "0 3 * * *" }, jobId: "daily-link-check" } // 03:00 server time, low-traffic hours
  );
}
