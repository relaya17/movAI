import Redis from "ioredis";

export interface CreateRedisOptions {
  url: string;
  /** Fails fast instead of buffering commands forever against a dead Redis - surfaces outages instead of hanging requests. */
  maxRetriesPerRequest?: number;
}

/**
 * Shared Redis factory for request/response use (cache, rate-limits).
 *
 * When Redis is down (common in local dev without Docker), the previous
 * defaults kept reconnecting forever and queued every command - that
 * flooded the terminal with ECONNREFUSED and made login/signup hang.
 * These options fail fast and stop the reconnect storm after a few tries.
 */
export function createRedisClient(options: CreateRedisOptions): Redis {
  const client = new Redis(options.url, {
    maxRetriesPerRequest: options.maxRetriesPerRequest ?? 1,
    // Don't dial until the first command - Nest/Next boot shouldn't open a
    // doomed TCP loop just because REDIS_URL points at a stopped container.
    lazyConnect: true,
    // Keep the offline queue so the first command can wait for lazyConnect
    // to finish when Redis *is* up. connectTimeout + retryStrategy below
    // are what stop the "buttons hang forever" case when Redis is down.
    connectTimeout: 2_000,
    // Stop reconnecting after a handful of failures; returning null ends the
    // retry loop. Callers that need Redis again can create a fresh client or
    // wait until infra is up and the process is restarted.
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 1_000);
    },
    // Windows resolves `localhost` to IPv6 (::1) first; Docker Redis is
    // bound on IPv4 only. Force IPv4 so redis://localhost:... still works.
    family: 4
  });

  // ioredis emits 'error' on connection failure; without a listener Node
  // prints "Unhandled error event" and the reconnect loop looks like a crash.
  client.on("error", () => {
    // Intentionally empty - callers already handle command failures via try/catch
    // (e.g. rate-limit fails open). Logging every refused connect would spam
    // the same ECONNREFUSED line hundreds of times per second.
  });

  return client;
}
