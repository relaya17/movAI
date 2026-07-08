import { date, jsonb, pgTable, primaryKey, smallint, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { movies } from "./catalog";

/**
 * Domain-specific preferences, kept separate from the Auth.js `users` table
 * (schema/auth.ts) on purpose - see the comment there. Seeds the
 * content-based recommender before a user has rated anything, via the
 * onboarding quiz (architecture plan §15.2).
 */
export const userPreferences = pgTable("user_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  favoriteGenres: jsonb("favorite_genres").$type<string[]>().notNull().default([]),
  favoriteDecades: jsonb("favorite_decades").$type<number[]>().notNull().default([]),
  seedMovieIds: jsonb("seed_movie_ids").$type<string[]>().notNull().default([])
});

/** Profile fields collected at email sign-up - kept off the Auth.js users table on purpose. */
export const userProfiles = pgTable("user_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  username: text("username").notNull().unique(),
  dateOfBirth: date("date_of_birth").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow()
});

export const watchlistItems = pgTable(
  "watchlist_items",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    movieId: uuid("movie_id")
      .notNull()
      .references(() => movies.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { mode: "date" }).notNull().defaultNow()
  },
  (table) => [primaryKey({ columns: [table.userId, table.movieId] })]
);

export const ratings = pgTable(
  "ratings",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    movieId: uuid("movie_id")
      .notNull()
      .references(() => movies.id, { onDelete: "cascade" }),
    score: smallint("score").notNull(),
    ratedAt: timestamp("rated_at", { mode: "date" }).notNull().defaultNow()
  },
  (table) => [primaryKey({ columns: [table.userId, table.movieId] })]
);
