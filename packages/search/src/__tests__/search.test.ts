import { describe, expect, it, vi } from "vitest";
import type { MeiliSearch } from "meilisearch";
import { searchMovies } from "../search";

const SAMPLE_HIT = {
  id: "8f14e45f-ceea-467e-9575-000000000001",
  slug: "his-girl-friday-1940",
  title: "His Girl Friday",
  year: 1940,
  genres: ["Comedy"],
  synopsis: "A fast-talking newspaper comedy.",
  watchSource: { kind: "archive", identifier: "his_girl_friday", license: "public-domain" },
  linkStatus: "active"
};

function createFakeMeiliClient(searchImpl: ReturnType<typeof vi.fn>) {
  return { index: () => ({ search: searchImpl }) } as unknown as MeiliSearch;
}

describe("searchMovies", () => {
  it("builds no filter when no criteria are given, and validates hits", async () => {
    const search = vi.fn().mockResolvedValue({ hits: [SAMPLE_HIT] });
    const client = createFakeMeiliClient(search);

    const hits = await searchMovies(client, { query: "friday" });

    expect(search).toHaveBeenCalledWith("friday", { limit: 20 });
    expect(hits).toHaveLength(1);
    expect(hits[0]?.title).toBe("His Girl Friday");
  });

  it("combines genre and year-range filters with AND", async () => {
    const search = vi.fn().mockResolvedValue({ hits: [] });
    const client = createFakeMeiliClient(search);

    await searchMovies(client, { query: "comedy", genre: "Comedy", yearFrom: 1930, yearTo: 1950, limit: 5 });

    expect(search).toHaveBeenCalledWith("comedy", {
      filter: 'genres = "Comedy" AND year >= 1930 AND year <= 1950',
      limit: 5
    });
  });

  it("throws when a hit fails schema validation", async () => {
    const search = vi.fn().mockResolvedValue({ hits: [{ id: "not-a-uuid" }] });
    const client = createFakeMeiliClient(search);

    await expect(searchMovies(client, { query: "x" })).rejects.toThrow();
  });
});
