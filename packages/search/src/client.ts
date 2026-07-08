import { MeiliSearch } from "meilisearch";

export interface CreateSearchClientOptions {
  host: string;
  apiKey: string;
}

export function createSearchClient(options: CreateSearchClientOptions): MeiliSearch {
  return new MeiliSearch({ host: options.host, apiKey: options.apiKey });
}

export const MOVIES_INDEX_NAME = "movies";
