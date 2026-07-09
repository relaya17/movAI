import "./load-env";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import {
  attachDeadLetterRouting,
  createDeadLetterQueue,
  createIngestionQueue,
  createIngestionWorker,
  createLinkCheckQueue,
  createLinkCheckWorker,
  createSubtitleWorker,
  createQueueConnection,
  scheduleDailyIngestion,
  scheduleDailyLinkCheck,
  QUEUE_NAMES
} from "@movai/queue";
import {
  createArchiveOrgAdapter,
  createYoutubeAdapter,
  createTmdbEnricher,
  type ContentAdapter,
  type TmdbEnricher
} from "@movai/content-adapters";
import { getMoviesDueForLinkCheck, updateMovieLinkStatus, upsertMovie, type Database } from "@movai/db";
import type { PublicMovie } from "@movai/types";
import { ensureMoviesIndex, indexMovies } from "@movai/search";
import { invalidateNamespace } from "@movai/cache";
import type { MeiliSearch } from "meilisearch";
import type { Redis } from "ioredis";
import { WorkerModule } from "./worker.module";
import { DATABASE, SEARCH_CLIENT, REDIS_CLIENT } from "./infra/tokens";
import { initSentry, captureMessage } from "./monitoring/alerting";
import { processSubtitleJob } from "./subtitles/process-subtitle";

/**
 * Separate process from the HTTP API (apps/api/src/main.ts) - BullMQ
 * workers should not share a runtime with request handling, so a worker
 * crash/restart never takes the API down and vice versa. Bootstraps from
 * WorkerModule (not AppModule) on purpose - WorkerModule pulls in
 * DATABASE/SEARCH_CLIENT/REDIS_CLIENT via the same @Global() InfraModule
 * AppModule uses (so the connection setup logic still only lives in one
 * place), but none of the HTTP-only modules - see worker.module.ts for why
 * that separation matters.
 */
async function bootstrap(): Promise<void> {
  initSentry("worker");

  const logger = new Logger("Worker");
  const appContext = await NestFactory.createApplicationContext(WorkerModule);

  const db = appContext.get<Database>(DATABASE);
  const search = appContext.get<MeiliSearch>(SEARCH_CLIENT);
  const redis = appContext.get<Redis>(REDIS_CLIENT);

  // Idempotent - safe to run on every worker boot (see index-setup.ts). This
  // is what actually configures Meilisearch's filterable/searchable
  // attributes; skipping it left `genres`/`year` filters in searchMovies()
  // silently broken against a freshly-created index.
  await ensureMoviesIndex(search);

  const connection = createQueueConnection({ url: process.env.REDIS_URL ?? "redis://127.0.0.1:6380" });

  const youtubeApiKey = process.env.YOUTUBE_API_KEY;
  const adapters: ContentAdapter[] = [
    createArchiveOrgAdapter(),
    ...(youtubeApiKey ? [createYoutubeAdapter({ apiKey: youtubeApiKey })] : [])
  ];

  const tmdbApiKey = process.env.TMDB_API_KEY;
  const tmdbEnricher: TmdbEnricher | undefined = tmdbApiKey ? createTmdbEnricher({ apiKey: tmdbApiKey }) : undefined;
  if (!tmdbEnricher) {
    logger.warn("TMDB_API_KEY not set - ingested movies will have no poster/genre/synopsis enrichment.");
  }

  const deadLetterQueue = createDeadLetterQueue(connection);

  const ingestionWorker = createIngestionWorker({
    connection,
    adapters,
    onMoviesFetched: async (movies) => {
      const processed: PublicMovie[] = [];

      for (const rawMovie of movies) {
        // TMDB is a *film* database - matching a standup special or a music
        // performance against it would at best do nothing and at worst
        // attach a wrong film's poster/synopsis/tmdbId to unrelated content.
        // Only ever enrich actual movies.
        const enriched =
          tmdbEnricher && rawMovie.contentType === "movie" ? await tmdbEnricher.enrich(rawMovie) : rawMovie;

        // Verify the link right away instead of leaving every freshly
        // ingested movie stuck as "unchecked" (and therefore invisible -
        // listMovies() only returns linkStatus "active") until the next
        // 03:00 daily link-check job reaches it, which could be up to a day
        // away for a large batch.
        const adapter = adapters.find((candidate) => candidate.name === enriched.watchSource.kind);
        const isAlive = adapter ? await adapter.checkLinkAlive(enriched) : true;
        const verified: PublicMovie = {
          ...enriched,
          linkStatus: isAlive ? "active" : "dead",
          linkLastCheckedAt: new Date().toISOString()
        };

        await upsertMovie(db, verified);
        processed.push(verified);
      }

      await indexMovies(search, processed);

      // The 5-minute cache-aside TTL on movie search (apps/api MoviesService)
      // would otherwise let a query that was searched moments before this
      // ingestion run keep serving the pre-ingestion (empty/stale) result set.
      await invalidateNamespace(redis, "movie-search");

      logger.log(`Ingested, verified and indexed ${processed.length} movie(s)`);
    }
  });
  attachDeadLetterRouting(ingestionWorker, deadLetterQueue, QUEUE_NAMES.ingestion, (entry) =>
    captureMessage(`Ingestion job exhausted all retries: ${entry.failedReason}`, entry)
  );

  const linkCheckWorker = createLinkCheckWorker({
    connection,
    adapters,
    fetchMoviesDueForCheck: (olderThanDays, batchSize) => getMoviesDueForLinkCheck(db, olderThanDays, batchSize),
    updateLinkStatus: (movieId, status, checkedAt) => updateMovieLinkStatus(db, movieId, status, checkedAt)
  });
  attachDeadLetterRouting(linkCheckWorker, deadLetterQueue, QUEUE_NAMES.linkCheck, (entry) =>
    captureMessage(`Link-check job exhausted all retries: ${entry.failedReason}`, entry)
  );

  const subtitleWorker = createSubtitleWorker({
    connection,
    processSubtitle: async (subtitleId) => {
      await processSubtitleJob(db, subtitleId);
    }
  });
  attachDeadLetterRouting(subtitleWorker, deadLetterQueue, QUEUE_NAMES.subtitles, (entry) =>
    captureMessage(`Subtitle job exhausted all retries: ${entry.failedReason}`, entry)
  );

  const linkCheckQueue = createLinkCheckQueue(connection);
  await scheduleDailyLinkCheck(linkCheckQueue);

  // The catalog previously only grew when an operator manually POSTed to
  // /admin/ingest with one query at a time - this is what actually keeps it
  // filling itself in, day over day, without anyone touching it.
  const ingestionQueue = createIngestionQueue(connection);
  await scheduleDailyIngestion(
    ingestionQueue,
    adapters.map((adapter) => adapter.name) as ("youtube" | "archive")[]
  );

  logger.log("MoVAI workers running (ingestion, daily catalog sweep, link-check, subtitles, dead-letter routing active)");

  const shutdown = async (): Promise<void> => {
    logger.log("Shutting down workers...");
    await Promise.all([
      ingestionWorker.close(),
      linkCheckWorker.close(),
      subtitleWorker.close(),
      linkCheckQueue.close(),
      ingestionQueue.close(),
      deadLetterQueue.close()
    ]);
    await appContext.close();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown());
  process.on("SIGINT", () => void shutdown());
}

bootstrap().catch((error: unknown) => {
  console.error("Failed to start MoVAI workers", error);
  process.exitCode = 1;
});
