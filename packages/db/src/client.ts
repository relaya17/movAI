import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema/index";

export interface CreateDbOptions {
  /**
   * Use the pooled connection string (e.g. Neon's PgBouncer-fronted URL),
   * not the direct one, whenever the API runs on a serverless/short-lived
   * host - see architecture plan §11.3. Without pooling, every cold start
   * opens a fresh Postgres connection and the DB chokes under load.
   */
  connectionString: string;
  /** Neon and most managed Postgres providers require TLS; disable only for local docker-compose. */
  ssl?: boolean;
  maxConnections?: number;
}

export type Database = ReturnType<typeof createDb>;

/**
 * The type of the `tx` callback argument from `db.transaction(async (tx) => ...)`.
 * Not the same TypeScript type as `Database` (drizzle gives transactions a
 * distinct branded type), but supports the same query-builder API, so
 * repository functions that need to run either inside or outside a
 * transaction (e.g. repositories/credits.ts) accept this type instead.
 */
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export function createDb(options: CreateDbOptions) {
  const client = postgres(options.connectionString, {
    ssl: options.ssl ?? true,
    max: options.maxConnections ?? 10
  });

  return drizzle(client, { schema });
}
