import { Global, Module, type Provider } from "@nestjs/common";
import { createDb, type Database } from "@movai/db";
import { createRedisClient } from "@movai/cache";
import { createSearchClient } from "@movai/search";
import { createIngestionQueue, createQueueConnection } from "@movai/queue";
import { DATABASE, REDIS_CLIENT, SEARCH_CLIENT, INGESTION_QUEUE } from "./tokens.js";

const databaseProvider: Provider = {
  provide: DATABASE,
  useFactory: (): Database =>
    createDb({
      connectionString: process.env.DATABASE_URL ?? "postgres://movai:movai@localhost:5433/movai",
      ssl: process.env.NODE_ENV === "production",
      // Was always createDb()'s hardcoded default (10) regardless of
      // environment - fine for a laptop, a hard ceiling under real
      // production concurrency. Env-configurable so it can be raised per
      // deployment without a code change. This is a *per-process* pool (the
      // HTTP api and the worker each open their own), not a global cap.
      maxConnections: process.env.DATABASE_POOL_MAX ? Number.parseInt(process.env.DATABASE_POOL_MAX, 10) : 10
    })
};

const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: () => createRedisClient({ url: process.env.REDIS_URL ?? "redis://localhost:6380" })
};

const searchProvider: Provider = {
  provide: SEARCH_CLIENT,
  useFactory: () =>
    createSearchClient({
      host: process.env.MEILI_HOST ?? "http://localhost:7700",
      apiKey: process.env.MEILI_API_KEY ?? "movai-dev-master-key"
    })
};

/**
 * Producer-side queue handle for the HTTP process (apps/api) - only used to
 * `.add()` jobs (e.g. from AdminController). The actual job *processing*
 * (Workers) runs in the separate apps/api/src/worker.ts process, never here.
 */
const ingestionQueueProvider: Provider = {
  provide: INGESTION_QUEUE,
  useFactory: () => createIngestionQueue(createQueueConnection({ url: process.env.REDIS_URL ?? "redis://localhost:6380" }))
};

/**
 * @Global() so HealthModule/MoviesModule (and future modules) can inject
 * DATABASE/REDIS_CLIENT/SEARCH_CLIENT without each re-declaring the wiring -
 * these are singleton infra connections, not per-feature state.
 */
@Global()
@Module({
  providers: [databaseProvider, redisProvider, searchProvider, ingestionQueueProvider],
  exports: [DATABASE, REDIS_CLIENT, SEARCH_CLIENT, INGESTION_QUEUE]
})
export class InfraModule {}
