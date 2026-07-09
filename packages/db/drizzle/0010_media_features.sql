CREATE TYPE "public"."subtitle_status" AS ENUM('pending', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."subtitle_source" AS ENUM('whisper', 'youtube_native', 'manual');--> statement-breakpoint
CREATE TYPE "public"."subtitle_format" AS ENUM('vtt', 'srt');--> statement-breakpoint
CREATE TYPE "public"."dubbing_permission_status" AS ENUM('pending', 'approved', 'denied');--> statement-breakpoint
CREATE TYPE "public"."dubbing_job_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "movie_subtitles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"movie_id" uuid NOT NULL,
	"language" text NOT NULL,
	"format" "subtitle_format" DEFAULT 'vtt' NOT NULL,
	"source" "subtitle_source" DEFAULT 'whisper' NOT NULL,
	"status" "subtitle_status" DEFAULT 'pending' NOT NULL,
	"content" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);--> statement-breakpoint
CREATE TABLE "dubbing_permission_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"movie_id" uuid NOT NULL,
	"target_language" text NOT NULL,
	"reason" text,
	"status" "dubbing_permission_status" DEFAULT 'pending' NOT NULL,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "dubbing_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"movie_id" uuid NOT NULL,
	"permission_request_id" uuid,
	"target_language" text NOT NULL,
	"status" "dubbing_job_status" DEFAULT 'pending' NOT NULL,
	"provider_project_id" text,
	"result_url" text,
	"credits_used" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "movie_subtitles" ADD CONSTRAINT "movie_subtitles_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dubbing_permission_requests" ADD CONSTRAINT "dubbing_permission_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dubbing_permission_requests" ADD CONSTRAINT "dubbing_permission_requests_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dubbing_jobs" ADD CONSTRAINT "dubbing_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dubbing_jobs" ADD CONSTRAINT "dubbing_jobs_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dubbing_jobs" ADD CONSTRAINT "dubbing_jobs_permission_request_id_dubbing_permission_requests_id_fk" FOREIGN KEY ("permission_request_id") REFERENCES "public"."dubbing_permission_requests"("id") ON DELETE set null ON UPDATE no action;
