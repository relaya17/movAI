import type { ContentType, PublicMovie } from "@movai/types";

/**
 * Contract every content source adapter implements. Kept intentionally
 * narrow: adapters only need to answer "search" and "checkLink" - all
 * caching, retries and circuit-breaking live in the shared resilience layer
 * (resilience.ts), not duplicated per adapter.
 */
export interface ContentAdapter {
  readonly name: string;
  /**
   * `contentType` steers adapters that can search more than one kind of
   * content (currently only youtube.ts - archive-org.ts always produces
   * "movie" regardless of what's passed) toward the right underlying
   * category/results and tags the returned PublicMovie[] accordingly.
   * Defaults to "movie" so every pre-existing caller keeps working unchanged.
   */
  search(query: string, contentType?: ContentType): Promise<PublicMovie[]>;
  /** Used by the daily "link rot" job - architecture plan §12.6. */
  checkLinkAlive(movie: PublicMovie): Promise<boolean>;
}
