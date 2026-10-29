CREATE TABLE "pricing_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"input_usd_cents_per_million" integer NOT NULL,
	"output_usd_cents_per_million" integer NOT NULL,
	"cached_input_usd_cents_per_million" integer,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "pricing_tier" text;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "usage_source" text DEFAULT 'upstream' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "pricing_tiers_slug_uq" ON "pricing_tiers" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "models_pricing_tier_idx" ON "models" USING btree ("pricing_tier");