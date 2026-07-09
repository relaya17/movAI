import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { movies } from "./catalog";
import { users } from "./auth";

export const subtitleStatusEnum = pgEnum("subtitle_status", ["pending", "processing", "ready", "failed"]);
export const subtitleSourceEnum = pgEnum("subtitle_source", ["whisper", "youtube_native", "manual"]);
export const subtitleFormatEnum = pgEnum("subtitle_format", ["vtt", "srt"]);

export const dubbingPermissionStatusEnum = pgEnum("dubbing_permission_status", ["pending", "approved", "denied"]);
export const dubbingJobStatusEnum = pgEnum("dubbing_job_status", ["pending", "processing", "completed", "failed"]);

/** Auto-generated or imported subtitle tracks for catalog movies (Stage B). */
export const movieSubtitles = pgTable("movie_subtitles", {
  id: uuid("id").primaryKey().defaultRandom(),
  movieId: uuid("movie_id")
    .notNull()
    .references(() => movies.id, { onDelete: "cascade" }),
  language: text("language").notNull(),
  format: subtitleFormatEnum("format").notNull().default("vtt"),
  source: subtitleSourceEnum("source").notNull().default("whisper"),
  status: subtitleStatusEnum("status").notNull().default("pending"),
  content: text("content"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true })
});

/** User requests to dub CC-licensed or unknown-license catalog items (legal gate). */
export const dubbingPermissionRequests = pgTable("dubbing_permission_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  movieId: uuid("movie_id")
    .notNull()
    .references(() => movies.id, { onDelete: "cascade" }),
  targetLanguage: text("target_language").notNull(),
  reason: text("reason"),
  status: dubbingPermissionStatusEnum("status").notNull().default("pending"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

/** Full dubbing jobs via ElevenLabs (Stage C) — long-running, credit-charged. */
export const dubbingJobs = pgTable("dubbing_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  movieId: uuid("movie_id")
    .notNull()
    .references(() => movies.id, { onDelete: "cascade" }),
  permissionRequestId: uuid("permission_request_id").references(() => dubbingPermissionRequests.id, {
    onDelete: "set null"
  }),
  targetLanguage: text("target_language").notNull(),
  status: dubbingJobStatusEnum("status").notNull().default("pending"),
  providerProjectId: text("provider_project_id"),
  resultUrl: text("result_url"),
  creditsUsed: text("credits_used"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true })
});
