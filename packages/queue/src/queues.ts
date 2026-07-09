import { Queue, type ConnectionOptions } from "bullmq";
import { z } from "zod";
import { ContentTypeSchema } from "@movai/types";

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
  subtitles: "subtitles",
  dubbing: "dubbing",
  onboarding: "onboarding",
  deadLetter: "dead-letter"
} as const;

export const IngestionJobSchema = z.object({
  source: z.enum(["youtube", "archive"]),
  query: z.string().min(1),
  /**
   * What kind of content this search is meant to surface (browse-page
   * category, see @movai/types ContentType). Defaults to "movie" so every
   * pre-existing job payload (manual /admin/ingest calls, already-scheduled
   * repeatable jobs) keeps behaving exactly as before without needing this
   * field. "archive" only ever produces "movie" content regardless of what's
   * requested here - see archive-org.ts.
   */
  contentType: ContentTypeSchema.default("movie")
});
export type IngestionJob = z.infer<typeof IngestionJobSchema>;

export const LinkCheckJobSchema = z.object({
  /** Only re-check movies whose linkLastCheckedAt is older than this, in days (architecture plan §12.6). */
  olderThanDays: z.number().int().positive().default(7),
  batchSize: z.number().int().positive().max(500).default(100)
});
export type LinkCheckJob = z.infer<typeof LinkCheckJobSchema>;

export const SubtitleJobSchema = z.object({
  subtitleId: z.string().uuid()
});
export type SubtitleJob = z.infer<typeof SubtitleJobSchema>;

export const DubbingJobSchema = z.object({
  jobId: z.string().uuid()
});
export type DubbingJob = z.infer<typeof DubbingJobSchema>;

export const OnboardingDripJobSchema = z.object({
  dripDay: z.union([z.literal(3), z.literal(7)])
});
export type OnboardingDripJob = z.infer<typeof OnboardingDripJobSchema>;

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

function attachQuietErrorHandler(queue: Queue): void {
  // BullMQ's internal ioredis clients emit 'error' on ECONNREFUSED; without a
  // listener Node prints "Unhandled error event" and it looks like a crash loop.
  queue.on("error", () => {
    /* callers surface failures via rejected promises on .add() / workers */
  });
}

export function createIngestionQueue(connection: ConnectionOptions): Queue<IngestionJob> {
  const queue = new Queue<IngestionJob>(QUEUE_NAMES.ingestion, {
    connection,
    prefix: QUEUE_PREFIX,
    defaultJobOptions: DEFAULT_JOB_OPTIONS
  });
  attachQuietErrorHandler(queue);
  return queue;
}

export function createLinkCheckQueue(connection: ConnectionOptions): Queue<LinkCheckJob> {
  const queue = new Queue<LinkCheckJob>(QUEUE_NAMES.linkCheck, {
    connection,
    prefix: QUEUE_PREFIX,
    defaultJobOptions: DEFAULT_JOB_OPTIONS
  });
  attachQuietErrorHandler(queue);
  return queue;
}

export function createSubtitleQueue(connection: ConnectionOptions): Queue<SubtitleJob> {
  const queue = new Queue<SubtitleJob>(QUEUE_NAMES.subtitles, {
    connection,
    prefix: QUEUE_PREFIX,
    defaultJobOptions: { ...DEFAULT_JOB_OPTIONS, attempts: 2 }
  });
  attachQuietErrorHandler(queue);
  return queue;
}

export function createLazySubtitleQueue(connection: ConnectionOptions): Pick<Queue<SubtitleJob>, "add"> {
  let queue: Queue<SubtitleJob> | undefined;
  return {
    add: (...args: Parameters<Queue<SubtitleJob>["add"]>) => {
      queue ??= createSubtitleQueue(connection);
      return queue.add(...args);
    }
  };
}

export function createDubbingQueue(connection: ConnectionOptions): Queue<DubbingJob> {
  const queue = new Queue<DubbingJob>(QUEUE_NAMES.dubbing, {
    connection,
    prefix: QUEUE_PREFIX,
    defaultJobOptions: { ...DEFAULT_JOB_OPTIONS, attempts: 2 }
  });
  attachQuietErrorHandler(queue);
  return queue;
}

export function createLazyDubbingQueue(connection: ConnectionOptions): Pick<Queue<DubbingJob>, "add"> {
  let queue: Queue<DubbingJob> | undefined;
  return {
    add: (...args: Parameters<Queue<DubbingJob>["add"]>) => {
      queue ??= createDubbingQueue(connection);
      return queue.add(...args);
    }
  };
}

export function createOnboardingQueue(connection: ConnectionOptions): Queue<OnboardingDripJob> {
  const queue = new Queue<OnboardingDripJob>(QUEUE_NAMES.onboarding, {
    connection,
    prefix: QUEUE_PREFIX,
    defaultJobOptions: DEFAULT_JOB_OPTIONS
  });
  attachQuietErrorHandler(queue);
  return queue;
}

/** Daily onboarding drip scan (day 3 + day 7 emails). */
export async function scheduleDailyOnboardingDrip(queue: Queue<OnboardingDripJob>): Promise<void> {
  await queue.add("drip-day-3", { dripDay: 3 }, { repeat: { pattern: "0 9 * * *" }, jobId: "onboarding-drip-3" });
  await queue.add("drip-day-7", { dripDay: 7 }, { repeat: { pattern: "0 9 * * *" }, jobId: "onboarding-drip-7" });
}

export function createDeadLetterQueue(connection: ConnectionOptions): Queue<DeadLetterJob> {
  // No retries here on purpose - a dead-letter entry is already the "final attempt failed" record.
  const queue = new Queue<DeadLetterJob>(QUEUE_NAMES.deadLetter, { connection, prefix: QUEUE_PREFIX });
  attachQuietErrorHandler(queue);
  return queue;
}

/**
 * Defers opening a Redis socket until the first `.add()` - used by the HTTP
 * API process so local `pnpm dev` without Docker doesn't dial Redis at boot.
 * The worker process still uses createIngestionQueue() eagerly (it needs Redis).
 */
export function createLazyIngestionQueue(connection: ConnectionOptions): Pick<Queue<IngestionJob>, "add"> {
  let queue: Queue<IngestionJob> | undefined;
  return {
    add: (...args: Parameters<Queue<IngestionJob>["add"]>) => {
      queue ??= createIngestionQueue(connection);
      return queue.add(...args);
    }
  };
}

/** Schedules the daily link-rot check (architecture plan §12.6) as a repeatable job. */
export async function scheduleDailyLinkCheck(queue: Queue<LinkCheckJob>): Promise<void> {
  await queue.add(
    "daily-link-check",
    { olderThanDays: 7, batchSize: 100 },
    { repeat: { pattern: "0 3 * * *" }, jobId: "daily-link-check" } // 03:00 server time, low-traffic hours
  );
}
