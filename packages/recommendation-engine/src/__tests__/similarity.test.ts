import { describe, expect, it } from "vitest";
import { cosineSimilarity, rankBySimilarity } from "../similarity";

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
