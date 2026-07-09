import { createRedisClient } from "@movai/cache";

/**
 * Single shared Redis client for the whole Next.js app (server-only, same
 * rationale as lib/db.ts) - currently only used for login rate-limiting
 * (lib/rate-limit.ts), kept as its own file so other server-only features
 * (caching, future queues) have one obvious place to import from too.
 */
export const redis = createRedisClient({
  url: process.env.REDIS_URL ?? "redis://127.0.0.1:6380",
  maxRetriesPerRequest: 1
});
