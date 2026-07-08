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
    // Built conditionally rather than `password: url.password || undefined` -
    // exactOptionalPropertyTypes (architecture plan §4.1) rejects an explicit
    // `undefined` assigned to an optional property.
    ...(url.password ? { password: url.password } : {})
  };
}
