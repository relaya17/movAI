CREATE TYPE "public"."content_type" AS ENUM('movie', 'standup', 'music', 'singing');--> statement-breakpoint
ALTER TABLE "movies" ADD COLUMN "content_type" "content_type" DEFAULT 'movie' NOT NULL;