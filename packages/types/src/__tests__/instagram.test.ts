import { describe, expect, it } from "vitest";
import { getInstagramEmbedUrl, parseInstagramUrl } from "../instagram";

describe("parseInstagramUrl", () => {
  it("parses reel URLs", () => {
    const parsed = parseInstagramUrl("https://www.instagram.com/reel/ABC123xyz/");
    expect(parsed).toEqual({
      shortcode: "ABC123xyz",
      mediaType: "reel",
      url: "https://www.instagram.com/reel/ABC123xyz/"
    });
    expect(getInstagramEmbedUrl(parsed!)).toBe("https://www.instagram.com/reel/ABC123xyz/embed");
  });

  it("parses post URLs", () => {
    const parsed = parseInstagramUrl("https://instagram.com/p/XYZ_99/");
    expect(parsed?.mediaType).toBe("post");
    expect(getInstagramEmbedUrl(parsed!)).toBe("https://www.instagram.com/p/XYZ_99/embed");
  });

  it("rejects non-Instagram URLs", () => {
    expect(parseInstagramUrl("https://youtube.com/watch?v=1")).toBeNull();
    expect(parseInstagramUrl("https://www.instagram.com/stories/user/1")).toBeNull();
  });
});
