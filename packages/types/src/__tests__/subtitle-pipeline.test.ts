import { describe, expect, it } from "vitest";
import { pickArchiveMediaFile } from "../subtitle-pipeline";

describe("pickArchiveMediaFile", () => {
  it("prefers mp4 when available", () => {
    const picked = pickArchiveMediaFile([
      { name: "foo_meta.xml", format: "Metadata" },
      { name: "movie.mp4", format: "MPEG4" },
      { name: "movie.ogv", format: "Ogg Video" }
    ]);
    expect(picked).toBe("movie.mp4");
  });

  it("returns null when no media files", () => {
    expect(pickArchiveMediaFile([{ name: "readme.txt" }])).toBeNull();
  });
});
