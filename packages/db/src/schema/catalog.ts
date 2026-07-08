import { integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { ContentClassification, WatchSource } from "@movai/types";

export const linkStatusEnum = pgEnum("link_status", ["active", "dead", "unchecked"]);

export const movies = pgTable("movies", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  originalTitle: text("original_title"),
  year: integer("year").notNull(),
  genres: jsonb("genres").$type<string[]>().notNull().default([]),
  synopsis: text("synopsis").notNull(),
  posterUrl: text("poster_url"),
  /** TMDB attribution is mandatory in the UI wherever this id is surfaced - see legal/README.md */
  tmdbId: integer("tmdb_id"),
  /** Discriminated union from @movai/types, stored as-is and re-validated with zod on read. */
  watchSource: jsonb("watch_source").$type<WatchSource>().notNull(),
  linkStatus: linkStatusEnum("link_status").notNull().default("unchecked"),
  linkLastCheckedAt: timestamp("link_last_checked_at", { mode: "date" }),
  classification: jsonb("classification").$type<ContentClassification>(),
  /**
   * Semantic-search embedding (architecture plan §5, layer 2). Stored as
   * jsonb for the MVP so this package doesn't hard-require the pgvector
   * extension to typecheck/build in environments without it provisioned.
   * Migrating this column to a native `vector` type (via drizzle-orm's
   * pgvector support) is a tracked Phase 2 task once a pgvector-enabled
   * Postgres instance (e.g. Neon with the extension enabled) is live.
   */
  embedding: jsonb("embedding").$type<number[]>(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow()
});
