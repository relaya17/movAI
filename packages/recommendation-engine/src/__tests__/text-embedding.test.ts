import { describe, expect, it } from "vitest";
import { buildMovieEmbeddingText, embedText, parseConciergeQuery } from "../text-embedding";

describe("embedText", () => {
  it("returns normalized vectors of fixed dimension", () => {
    const vector = embedText("drama film noir 1960");
    expect(vector).toHaveLength(384);
    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it("similar texts produce higher cosine similarity than unrelated", () => {
    const a = embedText("classic drama romance");
    const b = embedText("drama romantic film");
    const c = embedText("heavy metal concert");
    const dot = (x: number[], y: number[]) => x.reduce((sum, value, index) => sum + value * (y[index] ?? 0), 0);
    expect(dot(a, b)).toBeGreaterThan(dot(a, c));
  });
});

describe("parseConciergeQuery", () => {
  it("extracts Hebrew genre and decade", () => {
    const parsed = parseConciergeQuery("סרטי דרמה משנות השישים");
    expect(parsed.genres).toContain("drama");
    expect(parsed.yearFrom).toBe(1960);
    expect(parsed.yearTo).toBe(1969);
  });
});

describe("buildMovieEmbeddingText", () => {
  it("combines title genres year synopsis", () => {
    const text = buildMovieEmbeddingText({
      title: "Night of the Living Dead",
      genres: ["Horror"],
      year: 1968,
      synopsis: "Zombies rise."
    });
    expect(text).toContain("Night of the Living Dead");
    expect(text).toContain("1968");
  });
});
