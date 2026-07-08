import type { Redis } from "ioredis";

/**
 * Minimal structural shape we actually need from a validator - deliberately
 * NOT `z.ZodType<T>` directly. Zod schemas built with `.default()`/
 * `.optional()` fields have an `_input` type that differs from their
 * `_output` (z.infer) type, which makes `z.ZodType<T>` (input=output=T) too
 * strict to accept them - and routing T through `z.infer<SomeGeneric>`
 * across a generic function boundary makes TS's type-aware linter collapse
 * the inferred type to `any` in practice. Any Zod schema's `.safeParse`
 * structurally satisfies this interface, so real zod schemas plug in here
 * with no cast on either side.
 */
export interface ParsableSchema<T> {
  safeParse: (data: unknown) => { success: true; data: T } | { success: false; error: unknown };
}

export interface CacheAsideOptions<T> {
  redis: Redis;
  key: string;
  ttlSeconds: number;
  /**
   * Every cached value is re-validated before being trusted, not just
   * JSON.parsed - a stale/corrupt cache entry degrades to a cache miss
   * instead of returning garbage to the caller (defense in depth alongside
   * the circuit breaker in @movai/content-adapters).
   */
  schema: ParsableSchema<T>;
  compute: () => Promise<T>;
}

/**
 * Generic cache-aside helper used across the app: search results, LLM
 * content-classification output (architecture plan §5 - "cache aggressively
 * per movie-id, this is critical for cost"), and recommendation lookups.
 */
export async function cacheAside<T>(options: CacheAsideOptions<T>): Promise<T> {
  const cached = await options.redis.get(options.key);
  if (cached !== null) {
    const parsed = options.schema.safeParse(safeJsonParse(cached));
    if (parsed.success) {
      return parsed.data;
    }
    // Fall through to recompute - treat an unparseable/invalid entry as a miss.
  }

  const fresh = await options.compute();
  await options.redis.set(options.key, JSON.stringify(fresh), "EX", options.ttlSeconds);
  return fresh;
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

/** Namespacing convention so keys never collide across features - e.g. cacheKey("movie-classification", movieId). */
export function cacheKey(namespace: string, ...parts: string[]): string {
  return ["movai", namespace, ...parts].join(":");
}
