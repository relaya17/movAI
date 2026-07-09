import { describe, expect, it } from "vitest";
import { cosineSimilarity, diversify, rankBySimilarity } from "../similarity";

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("throws on mismatched vector lengths", () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow();
  });
});

describe("rankBySimilarity", () => {
  it("ranks the most similar candidate first", () => {
    const candidates = new Map<string, number[]>([
      ["a", [1, 0]],
      ["b", [0.9, 0.1]],
      ["c", [0, 1]]
    ]);

    const ranked = rankBySimilarity([1, 0], candidates, 2);

    expect(ranked).toHaveLength(2);
    expect(ranked[0]?.movieId).toBe("a");
    expect(ranked[1]?.movieId).toBe("b");
  });
});

describe("diversify", () => {
  it("avoids returning only the single tightest cluster (no genre-silo effect)", () => {
    // Two near-duplicates of the seed, plus one clearly different candidate.
    const candidates = new Map<string, number[]>([
      ["near-1", [1, 0.05]],
      ["near-2", [0.98, 0.02]],
      ["near-3", [0.97, 0.03]],
      ["different", [0.3, 0.95]]
    ]);

    const pureRelevance = rankBySimilarity([1, 0], candidates, 3).map((r) => r.movieId);
    const diversified = diversify([1, 0], candidates, 3, { lambda: 0.2 }).map((r) => r.movieId);

    // Pure relevance ranking is all near-duplicates - the failure mode we're fixing.
    expect(pureRelevance).not.toContain("different");
    // A more diversity-weighted MMR pass should surface the different item instead of a 4th near-duplicate.
    expect(diversified).toContain("different");
  });

  it("returns fewer results than limit if the candidate pool is smaller", () => {
    const candidates = new Map<string, number[]>([["a", [1, 0]]]);
    expect(diversify([1, 0], candidates, 5)).toHaveLength(1);
  });

  it("with lambda=1 behaves like pure relevance ranking", () => {
    const candidates = new Map<string, number[]>([
      ["a", [1, 0]],
      ["b", [0.9, 0.1]],
      ["c", [0, 1]]
    ]);
    const diversified = diversify([1, 0], candidates, 2, { lambda: 1 }).map((r) => r.movieId);
    expect(diversified).toEqual(["a", "b"]);
  });
});
