import { Worker, type ConnectionOptions, type Job } from "bullmq";
import type { ContentAdapter } from "@movai/content-adapters";
import type { MovieLinkStatus, PublicMovie } from "@movai/types";
import { QUEUE_NAMES, QUEUE_PREFIX, LinkCheckJobSchema, type LinkCheckJob } from "../queues";

/**
 * Pure predicate - no DB/clock dependency - so it can be unit tested without
 * a real database (architecture plan §12.6, "link rot" check).
 */
export function isDueForLinkCheck(lastCheckedAt: Date | null, olderThanDays: number, now: Date): boolean {
  if (lastCheckedAt === null) return true;
  const ageMs = now.getTime() - lastCheckedAt.getTime();
  const olderThanMs = olderThanDays * 24 * 60 * 60 * 1000;
  return ageMs >= olderThanMs;
}

export interface CreateLinkCheckWorkerOptions {
  connection: ConnectionOptions;
  adapters: readonly ContentAdapter[];
  /** Fetching/persisting are injected (ports & adapters) so this package never depends on @movai/db directly. */
  fetchMoviesDueForCheck: (olderThanDays: number, batchSize: number) => Promise<PublicMovie[]>;
  updateLinkStatus: (movieId: string, status: MovieLinkStatus, checkedAt: Date) => Promise<void>;
  /** Simple spacing between checks so a big batch never bursts past an adapter's rate limit (architecture plan §12.6/§13.2). */
  delayBetweenChecksMs?: number;
}

export function createLinkCheckWorker(options: CreateLinkCheckWorkerOptions): Worker<LinkCheckJob> {
  const delayMs = options.delayBetweenChecksMs ?? 600; // ~100/min ceiling

  return new Worker<LinkCheckJob>(
    QUEUE_NAMES.linkCheck,
    async (job: Job<LinkCheckJob>) => {
      const payload = LinkCheckJobSchema.parse(job.data);
      const movies = await options.fetchMoviesDueForCheck(payload.olderThanDays, payload.batchSize);

      let checked = 0;
      for (const movie of movies) {
        const adapter = options.adapters.find((candidate) => candidate.name === movie.watchSource.kind);
        const isAlive = adapter ? await adapter.checkLinkAlive(movie) : true;
        await options.updateLinkStatus(movie.id, isAlive ? "active" : "dead", new Date());
        checked += 1;
        await sleep(delayMs);
      }

      return { checked };
    },
    { connection: options.connection, prefix: QUEUE_PREFIX, concurrency: 1 }
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
