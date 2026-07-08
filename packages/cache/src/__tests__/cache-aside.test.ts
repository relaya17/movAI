import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { Redis } from "ioredis";
import { cacheAside, cacheKey } from "../cache-aside";

function createFakeRedis(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
      return "OK" as const;
    })
  };
}

const NumberSchema = z.object({ value: z.number() });

describe("cacheAside", () => {
  it("computes and caches on a miss", async () => {
    const fakeRedis = createFakeRedis();
    const compute = vi.fn().mockResolvedValue({ value: 42 });

    const result = await cacheAside({
      redis: fakeRedis as unknown as Redis,
      key: "test-key",
      ttlSeconds: 60,
      schema: NumberSchema,
      compute
    });

    expect(result).toEqual({ value: 42 });
    expect(compute).toHaveBeenCalledOnce();
    expect(fakeRedis.set).toHaveBeenCalledWith("test-key", JSON.stringify({ value: 42 }), "EX", 60);
  });

  it("returns the cached value without recomputing on a hit", async () => {
    const fakeRedis = createFakeRedis({ "test-key": JSON.stringify({ value: 7 }) });
    const compute = vi.fn().mockResolvedValue({ value: 999 });

    const result = await cacheAside({
      redis: fakeRedis as unknown as Redis,
      key: "test-key",
      ttlSeconds: 60,
      schema: NumberSchema,
      compute
    });

    expect(result).toEqual({ value: 7 });
    expect(compute).not.toHaveBeenCalled();
  });

  it("treats a schema-invalid cached entry as a miss and recomputes", async () => {
    const fakeRedis = createFakeRedis({ "test-key": JSON.stringify({ value: "not-a-number" }) });
    const compute = vi.fn().mockResolvedValue({ value: 1 });

    const result = await cacheAside({
      redis: fakeRedis as unknown as Redis,
      key: "test-key",
      ttlSeconds: 60,
      schema: NumberSchema,
      compute
    });

    expect(result).toEqual({ value: 1 });
    expect(compute).toHaveBeenCalledOnce();
  });
});

describe("cacheKey", () => {
  it("joins namespace and parts with the movai prefix", () => {
    expect(cacheKey("movie-classification", "abc-123")).toBe("movai:movie-classification:abc-123");
  });
});
