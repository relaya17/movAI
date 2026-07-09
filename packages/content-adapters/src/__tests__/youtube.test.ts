import { describe, expect, it, vi } from "vitest";
import { createYoutubeAdapter } from "../youtube";

describe("createYoutubeAdapter", () => {
  it("restricts search results to Creative-Commons-licensed videos", async () => {
    // Regression guard: without videoLicense=creativeCommon, YouTube's search
    // returns arbitrary videos regardless of license - including full
    // copyrighted films re-uploaded without permission, which this app can
    // never legally embed.
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ items: [] })
    })) as unknown as typeof fetch;

    const adapter = createYoutubeAdapter({ apiKey: "test-key", fetchImpl });
    await adapter.search("public domain film");

    const [calledUrl] = fetchImpl.mock.calls[0] as [string];
    const url = new URL(calledUrl);
    expect(url.searchParams.get("videoLicense")).toBe("creativeCommon");
  });

  it("maps a search result into a PublicMovie with the youtube watch source", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        items: [
          {
            id: { videoId: "abc123" },
            snippet: {
              title: "A Trip to the Moon",
              description: "Georges Méliès, 1902",
              channelTitle: "Public Domain Films",
              publishedAt: "1902-01-01T00:00:00Z"
            }
          }
        ]
      })
    })) as unknown as typeof fetch;

    const adapter = createYoutubeAdapter({ apiKey: "test-key", fetchImpl });
    const [movie] = await adapter.search("melies");

    expect(movie?.watchSource).toEqual({ kind: "youtube", videoId: "abc123", channelTitle: "Public Domain Films" });
    expect(movie?.title).toBe("A Trip to the Moon");
  });

  it("defaults to contentType 'movie' and YouTube's Film & Animation category when no contentType is passed", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ items: [] }) })) as unknown as typeof fetch;
    const adapter = createYoutubeAdapter({ apiKey: "test-key", fetchImpl });

    await adapter.search("classic film");

    const [calledUrl] = fetchImpl.mock.calls[0] as [string];
    expect(new URL(calledUrl).searchParams.get("videoCategoryId")).toBe("1");
  });

  it("switches YouTube's category and tags results by contentType for standup/music/singing", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        items: [
          {
            id: { videoId: "xyz789" },
            snippet: {
              title: "Open Mic Night",
              description: "A comedy set",
              channelTitle: "Some Channel",
              publishedAt: "2024-01-01T00:00:00Z"
            }
          }
        ]
      })
    })) as unknown as typeof fetch;
    const adapter = createYoutubeAdapter({ apiKey: "test-key", fetchImpl });

    const [movie] = await adapter.search("stand up comedy", "standup");

    const [calledUrl] = fetchImpl.mock.calls[0] as [string];
    expect(new URL(calledUrl).searchParams.get("videoCategoryId")).toBe("23"); // Comedy
    expect(movie?.contentType).toBe("standup");
  });

  it("still restricts music/singing searches to Creative-Commons results and tags them correctly", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ items: [] }) })) as unknown as typeof fetch;
    const adapter = createYoutubeAdapter({ apiKey: "test-key", fetchImpl });

    await adapter.search("acoustic cover", "singing");

    const [calledUrl] = fetchImpl.mock.calls[0] as [string];
    const url = new URL(calledUrl);
    expect(url.searchParams.get("videoCategoryId")).toBe("10"); // Music
    expect(url.searchParams.get("videoLicense")).toBe("creativeCommon");
  });
});
