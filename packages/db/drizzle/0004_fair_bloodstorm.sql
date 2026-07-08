CREATE TYPE "public"."upload_content_type" AS ENUM('standup', 'music', 'singing');--> statement-breakpoint
CREATE TYPE "public"."upload_status" AS ENUM('processing', 'published', 'rejected');--> statement-breakpoint
CREATE TABLE "gift_catalog" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"emoji" text NOT NULL,
	"cost_in_credits" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gift_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" text NOT NULL,
	"recipient_id" text NOT NULL,
	"upload_id" uuid NOT NULL,
	"gift_id" text NOT NULL,
	"credits_spent" integer NOT NULL,
	"credits_to_creator" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_user_id" text NOT NULL,
	"content_type" "upload_content_type" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"video_url" text,
	"thumbnail_url" text,
	"gifts_enabled" integer DEFAULT 1 NOT NULL,
	"status" "upload_status" DEFAULT 'processing' NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gift_transactions" ADD CONSTRAINT "gift_transactions_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_transactions" ADD CONSTRAINT "gift_transactions_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_transactions" ADD CONSTRAINT "gift_transactions_upload_id_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."uploads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_transactions" ADD CONSTRAINT "gift_transactions_gift_id_gift_catalog_id_fk" FOREIGN KEY ("gift_id") REFERENCES "public"."gift_catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_creator_user_id_users_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;