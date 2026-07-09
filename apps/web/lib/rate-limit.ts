import { redis } from "./redis";

export interface RateLimitResult {
  allowed: boolean;
  /** Only set when allowed is false - how long the caller should wait before trying again. */
  retryAfterSeconds?: number;
}

export interface RateLimitOptions {
  /** How many attempts are allowed within the window before blocking. */
  max: number;
  windowSeconds: number;
}

/**
 * Fixed-window counter (INCR + EXPIRE) - not perfectly precise at window
 * boundaries (a burst right at the edge of two windows can let through up
 * to ~2x max), but that imprecision is an accepted, well-known tradeoff for
 * a login brute-force guard; a sliding-window/token-bucket implementation
 * would be overkill here.
 *
 * Fails OPEN (allows the request) if Redis itself is unreachable, matching
 * this app's established resilience philosophy elsewhere (MoviesService,
 * content adapters) of degrading gracefully rather than taking the whole
 * feature down when a dependency is unavailable - a broken rate limiter
 * must never mean "nobody can log in."
 */
export async function checkRateLimit(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
  try {
    // lazyConnect client - first command opens the socket; race a short
    // timeout so a dead Redis can't stall login/signup for the default
    // ioredis connect window.
    const count = await withTimeout(redis.incr(key), 1_500);
    if (count === 1) {
      await withTimeout(redis.expire(key, options.windowSeconds), 1_500);
    }

    if (count > options.max) {
      const ttl = await withTimeout(redis.ttl(key), 1_500);
      return { allowed: false, retryAfterSeconds: ttl > 0 ? ttl : options.windowSeconds };
    }

    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

/** Clears a rate-limit counter - called on a successful login so a user who mistyped once isn't penalized once they get it right. */
export async function resetRateLimit(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch {
    // Best-effort - a failed reset just means the counter expires naturally via its own TTL instead.
  }
}

export function loginRateLimitKey(email: string): string {
  return `movai:login-attempts:${email.trim().toLowerCase()}`;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("redis timeout")), ms);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
