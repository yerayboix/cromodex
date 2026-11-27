CREATE TYPE "app"."delivery_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "app"."notification_topic" AS ENUM('trades', 'wanted');--> statement-breakpoint
CREATE TABLE "app"."channel_link_tokens" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "app"."channel_link_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"kind" text NOT NULL,
	"message" jsonb NOT NULL,
	"status" "app"."delivery_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	CONSTRAINT "notification_deliveries_once_key" UNIQUE("event_id","user_id","channel","kind")
);
--> statement-breakpoint
ALTER TABLE "app"."notification_deliveries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."notification_destinations" (
	"user_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"address" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_destinations_user_id_channel_pk" PRIMARY KEY("user_id","channel"),
	CONSTRAINT "notification_destinations_channel_address_key" UNIQUE("channel","address")
);
--> statement-breakpoint
ALTER TABLE "app"."notification_destinations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."notification_preferences" (
	"user_id" uuid NOT NULL,
	"topic" "app"."notification_topic" NOT NULL,
	"enabled" boolean NOT NULL,
	CONSTRAINT "notification_preferences_user_id_topic_pk" PRIMARY KEY("user_id","topic")
);
--> statement-breakpoint
ALTER TABLE "app"."notification_preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."channel_link_tokens" ADD CONSTRAINT "channel_link_tokens_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."notification_deliveries" ADD CONSTRAINT "notification_deliveries_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "app"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."notification_deliveries" ADD CONSTRAINT "notification_deliveries_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."notification_destinations" ADD CONSTRAINT "notification_destinations_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_deliveries_pending_idx" ON "app"."notification_deliveries" USING btree ("next_attempt_at") WHERE "app"."notification_deliveries"."status" = 'pending';--> statement-breakpoint
-- Events written before notifications existed are history: never notify them.
UPDATE "app"."events" SET "dispatched_at" = now() WHERE "dispatched_at" IS NULL;
