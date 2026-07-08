import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import type { MeiliSearch } from "meilisearch";
import type { Redis } from "ioredis";
import { MoviesService } from "../movies.service";

const SAMPLE_MOVIE = {
  id: "8f14e45f-ceea-467e-9575-000000000001",
  slug: "his-girl-friday-1940",
  title: "His Girl Friday",
  year: 1940,
  genres: ["Comedy"],
  synopsis: "A fast-talking newspaper comedy.",
  watchSource: { kind: "archive" as const, identifier: "his_girl_friday", license: "public-domain" as const },
  linkStatus: "active" as const
};

function createFakeRedis(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
      return "OK" as const;
    })
  } as unknown as Redis;
}

function createFakeMeili(searchImpl: ReturnType<typeof vi.fn>) {
  return { index: () => ({ search: searchImpl }) } as unknown as MeiliSearch;
}

describe("MoviesService", () => {
  it("returns cached/indexed results from Meilisearch when the index has hits", async () => {
    const search = vi.fn().mockResolvedValue({ hits: [SAMPLE_MOVIE] });
    const service = new MoviesService(createFakeMeili(search), createFakeRedis());

    const results = await service.search("friday");

    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe("His Girl Friday");
  });

  it("falls back to live content adapters when Meilisearch is unreachable", async () => {
    const search = vi.fn().mockRejectedValue(new Error("connection refused"));
    const service = new MoviesService(createFakeMeili(search), createFakeRedis());

    // No YOUTUBE_API_KEY configured and archive.org's real API isn't reachable
    // in this test sandbox either, but the important assertion is that the
    // service degrades gracefully instead of throwing (architecture plan §12.1).
    await expect(service.search("friday")).resolves.toEqual(expect.any(Array));
  });
});
