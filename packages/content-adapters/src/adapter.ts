import type { PublicMovie } from "@movai/types";

/**
 * Contract every content source adapter implements. Kept intentionally
 * narrow: adapters only need to answer "search" and "checkLink" - all
 * caching, retries and circuit-breaking live in the shared resilience layer
 * (resilience.ts), not duplicated per adapter.
 */
export interface ContentAdapter {
  readonly name: string;
  search(query: string): Promise<PublicMovie[]>;
  /** Used by the daily "link rot" job - architecture plan §12.6. */
  checkLinkAlive(movie: PublicMovie): Promise<boolean>;
}
