CREATE SCHEMA "app";
--> statement-breakpoint
CREATE TYPE "app"."listing_status" AS ENUM('active', 'withdrawn', 'exhausted');--> statement-breakpoint
CREATE TYPE "app"."negotiation_status" AS ENUM('open', 'accepted', 'rejected', 'cancelled', 'withdrawn');--> statement-breakpoint
CREATE TYPE "app"."party" AS ENUM('owner', 'offerer');--> statement-breakpoint
CREATE TABLE "app"."cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"code" text NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "cards_collection_code_key" UNIQUE("collection_id","code"),
	CONSTRAINT "cards_collection_sort_key" UNIQUE("collection_id","sort_order")
);
--> statement-breakpoint
ALTER TABLE "app"."cards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "collections_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "app"."collections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dispatched_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "app"."events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"card_code" text NOT NULL,
	"copies_total" integer NOT NULL,
	"copies_left" integer NOT NULL,
	"status" "app"."listing_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listings_copies_total_check" CHECK ("app"."listings"."copies_total" >= 1),
	CONSTRAINT "listings_copies_left_check" CHECK ("app"."listings"."copies_left" between 0 and "app"."listings"."copies_total")
);
--> statement-breakpoint
ALTER TABLE "app"."listings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."negotiations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"offerer_id" uuid NOT NULL,
	"alias" text NOT NULL,
	"status" "app"."negotiation_status" DEFAULT 'open' NOT NULL,
	"turn" "app"."party" DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	CONSTRAINT "negotiations_listing_alias_key" UNIQUE("listing_id","alias"),
	CONSTRAINT "negotiations_closed_at_check" CHECK (("app"."negotiations"."status" = 'open') = ("app"."negotiations"."closed_at" is null))
);
--> statement-breakpoint
ALTER TABLE "app"."negotiations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."proposal_cards" (
	"proposal_id" uuid NOT NULL,
	"card_code" text NOT NULL,
	CONSTRAINT "proposal_cards_proposal_id_card_code_pk" PRIMARY KEY("proposal_id","card_code")
);
--> statement-breakpoint
ALTER TABLE "app"."proposal_cards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"negotiation_id" uuid NOT NULL,
	"by" "app"."party" NOT NULL,
	"seq" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proposals_negotiation_seq_key" UNIQUE("negotiation_id","seq"),
	CONSTRAINT "proposals_seq_check" CHECK ("app"."proposals"."seq" >= 1)
);
--> statement-breakpoint
ALTER TABLE "app"."proposals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"negotiation_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"offerer_id" uuid NOT NULL,
	"owner_card" text NOT NULL,
	"offerer_cards" text[] NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trades_negotiationId_unique" UNIQUE("negotiation_id"),
	CONSTRAINT "trades_offerer_cards_check" CHECK (cardinality("app"."trades"."offerer_cards") >= 1),
	CONSTRAINT "trades_distinct_parties_check" CHECK ("app"."trades"."owner_id" <> "app"."trades"."offerer_id")
);
--> statement-breakpoint
ALTER TABLE "app"."trades" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."wanted" (
	"user_id" uuid NOT NULL,
	"collection_id" uuid NOT NULL,
	"card_code" text NOT NULL,
	CONSTRAINT "wanted_user_id_collection_id_card_code_pk" PRIMARY KEY("user_id","collection_id","card_code")
);
--> statement-breakpoint
ALTER TABLE "app"."wanted" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."cards" ADD CONSTRAINT "cards_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "app"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."listings" ADD CONSTRAINT "listings_owner_id_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "app"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."listings" ADD CONSTRAINT "listings_card_fk" FOREIGN KEY ("collection_id","card_code") REFERENCES "app"."cards"("collection_id","code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."negotiations" ADD CONSTRAINT "negotiations_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "app"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."negotiations" ADD CONSTRAINT "negotiations_offerer_id_profiles_id_fk" FOREIGN KEY ("offerer_id") REFERENCES "app"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."proposal_cards" ADD CONSTRAINT "proposal_cards_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "app"."proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."proposals" ADD CONSTRAINT "proposals_negotiation_id_negotiations_id_fk" FOREIGN KEY ("negotiation_id") REFERENCES "app"."negotiations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."trades" ADD CONSTRAINT "trades_negotiation_id_negotiations_id_fk" FOREIGN KEY ("negotiation_id") REFERENCES "app"."negotiations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."trades" ADD CONSTRAINT "trades_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "app"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."trades" ADD CONSTRAINT "trades_owner_id_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "app"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."trades" ADD CONSTRAINT "trades_offerer_id_profiles_id_fk" FOREIGN KEY ("offerer_id") REFERENCES "app"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."wanted" ADD CONSTRAINT "wanted_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."wanted" ADD CONSTRAINT "wanted_card_fk" FOREIGN KEY ("collection_id","card_code") REFERENCES "app"."cards"("collection_id","code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_pending_idx" ON "app"."events" USING btree ("created_at") WHERE "app"."events"."dispatched_at" is null;--> statement-breakpoint
CREATE INDEX "listings_board_idx" ON "app"."listings" USING btree ("collection_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "listings_one_active_per_card_idx" ON "app"."listings" USING btree ("owner_id","collection_id","card_code") WHERE "app"."listings"."status" = 'active';--> statement-breakpoint
CREATE INDEX "negotiations_listing_status_idx" ON "app"."negotiations" USING btree ("listing_id","status");--> statement-breakpoint
CREATE INDEX "negotiations_offerer_status_idx" ON "app"."negotiations" USING btree ("offerer_id","status");--> statement-breakpoint
CREATE INDEX "trades_accepted_at_idx" ON "app"."trades" USING btree ("accepted_at");--> statement-breakpoint
CREATE INDEX "wanted_collection_card_idx" ON "app"."wanted" USING btree ("collection_id","card_code");