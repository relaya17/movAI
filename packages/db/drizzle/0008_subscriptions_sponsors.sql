ALTER TYPE "public"."transaction_type" ADD VALUE 'subscription';--> statement-breakpoint
CREATE TYPE "public"."subscription_interval" AS ENUM('daily', 'weekly', 'monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'canceled', 'past_due', 'incomplete');--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"interval" "subscription_interval" NOT NULL,
	"name" text NOT NULL,
	"price_nis" numeric(10, 2) NOT NULL,
	"credits_per_period" integer DEFAULT 0 NOT NULL,
	"ad_free" boolean DEFAULT true NOT NULL,
	"priority_queue" boolean DEFAULT false NOT NULL,
	"early_access" boolean DEFAULT false NOT NULL,
	"founder_badge" boolean DEFAULT false NOT NULL,
	"stripe_price_id" text,
	"is_active" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_plans_interval_unique" UNIQUE("interval")
);
--> statement-breakpoint
CREATE TABLE "user_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"status" "subscription_status" DEFAULT 'incomplete' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "sponsors" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"image_url" text NOT NULL,
	"link_url" text NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_subscriptions_one_active_per_user" ON "user_subscriptions" USING btree ("user_id") WHERE "user_subscriptions"."status" = 'active';
