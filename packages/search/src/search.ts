import { z } from "zod";
import type { SearchParams } from "meilisearch";
import { PublicMovieSchema } from "@movai/types";
import type { MeiliSearch } from "meilisearch";
import { MOVIES_INDEX_NAME } from "./client";

export interface SearchMoviesOptions {
  query: string;
  genre?: string;
  yearFrom?: number;
  yearTo?: number;
  limit?: number;
}

const SearchResponseSchema = z.object({
  // Plain (non-passthrough) on purpose: zod strips Meilisearch's extra ranking/highlight fields
  // automatically, which also keeps this type identical to PublicMovie everywhere else it flows.
  hits: z.array(PublicMovieSchema)
});

/**
 * Text/filter search (layer 1 - architecture plan §5). Meilisearch's
 * response comes back over HTTP as `unknown` from our perspective, same
 * boundary rule as the content adapters: parse with zod, never cast to
 * `any`, so a malformed document in the index degrades to a validation
 * error instead of silently corrupting the API response shape.
 */
export async function searchMovies(client: MeiliSearch, options: SearchMoviesOptions) {
  const filters: string[] = [];
  if (options.genre) filters.push(`genres = "${options.genre}"`);
  if (options.yearFrom !== undefined) filters.push(`year >= ${options.yearFrom}`);
  if (options.yearTo !== undefined) filters.push(`year <= ${options.yearTo}`);

  // Built up conditionally rather than set to `undefined` - exactOptionalPropertyTypes
  // (architecture plan §4.1) rejects `{ filter: undefined }` for an optional field.
  const searchParams: SearchParams = { limit: options.limit ?? 20 };
  if (filters.length > 0) {
    searchParams.filter = filters.join(" AND ");
  }

  const rawResponse: unknown = await client.index(MOVIES_INDEX_NAME).search(options.query, searchParams);

  const parsed = SearchResponseSchema.parse(rawResponse);
  return parsed.hits;
}
