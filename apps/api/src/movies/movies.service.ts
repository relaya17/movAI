import { Inject, Injectable, Logger } from "@nestjs/common";
import { z } from "zod";
import { PublicMovieSchema, type PublicMovie } from "@movai/types";
import { createArchiveOrgAdapter, createYoutubeAdapter, type ContentAdapter } from "@movai/content-adapters";
import { searchMovies } from "@movai/search";
import { cacheAside, cacheKey } from "@movai/cache";
import type { MeiliSearch } from "meilisearch";
import type { Redis } from "ioredis";
import { REDIS_CLIENT, SEARCH_CLIENT } from "../infra/tokens.js";

const SEARCH_CACHE_TTL_SECONDS = 300;

@Injectable()
export class MoviesService {
  private readonly logger = new Logger(MoviesService.name);
  private readonly adapters: ContentAdapter[];

  constructor(
    @Inject(SEARCH_CLIENT) private readonly meiliClient: MeiliSearch,
    @Inject(REDIS_CLIENT) private readonly redis: Redis
  ) {
    const youtubeApiKey = process.env.YOUTUBE_API_KEY;
    this.adapters = [
      createArchiveOrgAdapter(),
      // Only registered when a key is configured - avoids crashing the API
      // in local/dev environments that haven't set up YouTube credentials yet.
      ...(youtubeApiKey ? [createYoutubeAdapter({ apiKey: youtubeApiKey })] : [])
    ];
  }

  async search(query: string): Promise<PublicMovie[]> {
    try {
      const cached = await cacheAside({
        redis: this.redis,
        key: cacheKey("movie-search", query.toLowerCase().trim()),
        ttlSeconds: SEARCH_CACHE_TTL_SECONDS,
        schema: z.array(PublicMovieSchema),
        compute: () => searchMovies(this.meiliClient, { query })
      });

      if (cached.length > 0) {
        return cached;
      }
      // Empty index (fresh dev environment, or genuinely no matches) -
      // fall through to live adapters below rather than returning nothing.
    } catch (error) {
      // Meilisearch/Redis being unreachable degrades to live adapter search,
      // it never 500s the request (same resilience philosophy as §12.1).
      this.logger.warn(`Search index unavailable for query "${query}", falling back to live adapters`, error as Error);
    }

    return this.searchLiveAdapters(query);
  }

  private async searchLiveAdapters(query: string): Promise<PublicMovie[]> {
    const results = await Promise.all(
      this.adapters.map(async (adapter) => {
        try {
          return await adapter.search(query);
        } catch (error) {
          this.logger.warn(`Adapter "${adapter.name}" failed for query "${query}"`, error as Error);
          return [];
        }
      })
    );

    return results.flat();
  }
}
