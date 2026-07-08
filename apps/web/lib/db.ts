import { createDb } from "@movai/db";

/**
 * Single shared Drizzle client for the whole Next.js app (server-only -
 * never imported from a "use client" file). Uses the *pooled* connection
 * string in production (architecture plan §11.3) - set DATABASE_URL to the
 * PgBouncer-fronted URL your Postgres provider (Neon/Supabase) gives you for
 * serverless/edge-adjacent runtimes.
 *
 * Falls back to a local docker-compose default so `next build` and local
 * dev don't hard-fail before infra is provisioned - the connection itself
 * is lazy (postgres.js doesn't dial until the first query), so this is safe
 * to construct even when nothing is listening yet.
 */
export const db = createDb({
  connectionString: process.env.DATABASE_URL ?? "postgres://movai:movai@localhost:5433/movai",
  ssl: process.env.NODE_ENV === "production",
  maxConnections: 10
});
