/** DI tokens - plain strings, not classes, since these wrap third-party client instances, not our own injectable classes. */
export const DATABASE = "DATABASE" as const;
export const REDIS_CLIENT = "REDIS_CLIENT" as const;
export const SEARCH_CLIENT = "SEARCH_CLIENT" as const;
export const INGESTION_QUEUE = "INGESTION_QUEUE" as const;
