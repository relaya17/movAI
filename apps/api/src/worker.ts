import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import {
  attachDeadLetterRouting,
  createDeadLetterQueue,
  createIngestionWorker,
  createLinkCheckQueue,
  createLinkCheckWorker,
  createQueueConnection,
  scheduleDailyLinkCheck,
  QUEUE_NAMES
} from "@movai/queue";
import { createArchiveOrgAdapter, createYoutubeAdapter, type ContentAdapter } from "@movai/content-adapters";
import { getMoviesDueForLinkCheck, updateMovieLinkStatus, upsertMovie, type Database } from "@movai/db";
import { indexMovies } from "@movai/search";
import type { MeiliSearch } from "meilisearch";
import { AppModule } from "./app.module";
import { DATABASE, SEARCH_CLIENT } from "./infra/tokens";

/**
 * Separate process from the HTTP API (apps/api/src/main.ts) - BullMQ
 * workers should not share a runtime with request handling, so a worker
 * crash/restart never takes the API down and vice versa. Still reuses the
 * same NestJS DI wiring for DATABASE/SEARCH_CLIENT (via a headless
 * application context, no HTTP listener) so the connection setup logic
 * only lives in one place (src/infra/infra.module.ts).
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger("Worker");
  const appContext = await NestFactory.createApplicationContext(AppModule);

  const db = appContext.get<Database>(DATABASE);
  const search = appContext.get<MeiliSearch>(SEARCH_CLIENT);

  const connection = createQueueConnection({ url: process.env.REDIS_URL ?? "redis://localhost:6380" });

  const youtubeApiKey = process.env.YOUTUBE_API_KEY;
  const adapters: ContentAdapter[] = [
    createArchiveOrgAdapter(),
    ...(youtubeApiKey ? [createYoutubeAdapter({ apiKey: youtubeApiKey })] : [])
  ];

  const deadLetterQueue = createDeadLetterQueue(connection);

  const ingestionWorker = createIngestionWorker({
    connection,
    adapters,
    onMoviesFetched: async (movies) => {
      for (const movie of movies) {
        await upsertMovie(db, movie);
      }
      await indexMovies(search, movies);
      logger.log(`Ingested and indexed ${movies.length} movie(s)`);
    }
  });
  attachDeadLetterRouting(ingestionWorker, deadLetterQueue, QUEUE_NAMES.ingestion);

  const linkCheckWorker = createLinkCheckWorker({
    connection,
    adapters,
    fetchMoviesDueForCheck: (olderThanDays, batchSize) => getMoviesDueForLinkCheck(db, olderThanDays, batchSize),
    updateLinkStatus: (movieId, status, checkedAt) => updateMovieLinkStatus(db, movieId, status, checkedAt)
  });
  attachDeadLetterRouting(linkCheckWorker, deadLetterQueue, QUEUE_NAMES.linkCheck);

  const linkCheckQueue = createLinkCheckQueue(connection);
  await scheduleDailyLinkCheck(linkCheckQueue);

  logger.log("MoVAI workers running (ingestion, link-check, dead-letter routing active)");

  const shutdown = async (): Promise<void> => {
    logger.log("Shutting down workers...");
    await Promise.all([ingestionWorker.close(), linkCheckWorker.close(), linkCheckQueue.close(), deadLetterQueue.close()]);
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
