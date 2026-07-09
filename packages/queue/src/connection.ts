import type { ConnectionOptions } from "bullmq";

export interface CreateQueueConnectionOptions {
  url: string;
}

/**
 * BullMQ requires `maxRetriesPerRequest: null` on its Redis connection (its
 * own docs call this out explicitly - blocking commands like BRPOPLPUSH
 * break otherwise). This is why @movai/queue owns its own connection
 * factory instead of reusing @movai/cache's createRedisClient, which sets a
 * finite retry count on purpose for regular request/response caching.
 */
export function createQueueConnection(options: CreateQueueConnectionOptions): ConnectionOptions {
  const url = new URL(options.url);
  return {
    host: url.hostname,
    port: url.port ? Number.parseInt(url.port, 10) : 6379,
    maxRetriesPerRequest: null,
    // Windows: prefer IPv4 - Docker publishes Redis on 127.0.0.1, not ::1.
    family: 4,
    // Don't open a TCP socket until the first queue command - the HTTP API
    // constructs Queue handles at boot but rarely needs Redis until an admin
    // ingest runs. Without this, a missing local Redis floods the terminal.
    lazyConnect: true,
    connectTimeout: 2_000,
    // Cap reconnect storms when Redis is down locally (no Docker). Returning
    // null stops ioredis retries so the API/dev terminal isn't flooded with
    // ECONNREFUSED and request handlers aren't stuck behind an offline queue.
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 1_000);
    },
    // Built conditionally rather than `password: url.password || undefined` -
    // exactOptionalPropertyTypes (architecture plan §4.1) rejects an explicit
    // `undefined` assigned to an optional property.
    ...(url.password ? { password: url.password } : {})
  };
}
