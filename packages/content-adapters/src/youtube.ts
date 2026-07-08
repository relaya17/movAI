import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { PublicMovie } from "@movai/types";
import type { ContentAdapter } from "./adapter";
import { CircuitBreaker } from "./resilience";

/**
 * YouTube Data API adapter.
 *
 * Legal notes (architecture plan §1.1) - do not remove:
 *  - Embedding via the official iframe player is permitted.
 *  - The YouTube brand/logo must be shown next to any embedded content
 *    (enforced in the UI layer, not here - see packages/ui/VideoPlayer).
 *  - We must never aggregate usage/revenue data about YouTube itself -
 *    this adapter only ever reads public video search results.
 */

const YOUTUBE_SEARCH_RESPONSE_SCHEMA = z.object({
  items: z.array(
    z.object({
      id: z.object({ videoId: z.string() }),
      snippet: z.object({
        title: z.string(),
        description: z.string(),
        channelTitle: z.string(),
        publishedAt: z.string()
      })
    })
  )
});

export interface YoutubeAdapterOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
}

export function createYoutubeAdapter(options: YoutubeAdapterOptions): ContentAdapter {
  const fetchImpl = options.fetchImpl ?? fetch;
  const breaker = new CircuitBreaker("youtube");

  return {
    name: "youtube",

    async search(query: string): Promise<PublicMovie[]> {
      return breaker.execute(
        async () => {
          const url = new URL("https://www.googleapis.com/youtube/v3/search");
          url.searchParams.set("part", "snippet");
          url.searchParams.set("type", "video");
          url.searchParams.set("videoCategoryId", "1"); // Film & Animation
          url.searchParams.set("q", query);
          url.searchParams.set("key", options.apiKey);

          const response = await fetchImpl(url.toString());
          if (!response.ok) {
            throw new Error(`YouTube API responded with ${response.status}`);
          }

          // Boundary rule: raw external data is `unknown` until parsed by
          // zod - never cast to `any` here, per architecture plan §4.
          const raw: unknown = await response.json();
          const parsed = YOUTUBE_SEARCH_RESPONSE_SCHEMA.parse(raw);

          return parsed.items.map((item) => mapToPublicMovie(item));
        },
        () => [] // fallback: empty results beat a crashed page
      );
    },

    async checkLinkAlive(movie: PublicMovie): Promise<boolean> {
      if (movie.watchSource.kind !== "youtube") return true;
      return breaker.execute(
        async () => {
          const response = await fetchImpl(
            `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${movie.watchSource.kind === "youtube" ? movie.watchSource.videoId : ""}&format=json`,
            { method: "HEAD" }
          );
          return response.ok;
        },
        () => true // fallback: assume alive rather than hide a movie on a transient network blip
      );
    }
  };
}

function mapToPublicMovie(item: z.infer<typeof YOUTUBE_SEARCH_RESPONSE_SCHEMA>["items"][number]): PublicMovie {
  const year = new Date(item.snippet.publishedAt).getFullYear();
  return {
    id: randomUUID(),
    slug: item.id.videoId,
    title: item.snippet.title,
    year,
    genres: [],
    synopsis: item.snippet.description,
    watchSource: { kind: "youtube", videoId: item.id.videoId, channelTitle: item.snippet.channelTitle },
    linkStatus: "unchecked"
  };
}
