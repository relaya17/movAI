import Redis from "ioredis";

export interface CreateRedisOptions {
  url: string;
  /** Fails fast instead of buffering commands forever against a dead Redis - surfaces outages instead of hanging requests. */
  maxRetriesPerRequest?: number;
}

export function createRedisClient(options: CreateRedisOptions): Redis {
  return new Redis(options.url, {
    maxRetriesPerRequest: options.maxRetriesPerRequest ?? 3,
    lazyConnect: false
  });
}
