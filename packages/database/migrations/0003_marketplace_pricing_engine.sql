DO $$ BEGIN
 CREATE TYPE "public"."pricing_status" AS ENUM('approved', 'pricing_pending', 'disabled', 'draft');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "pricing_status" "pricing_status" DEFAULT 'approved' NOT NULL;
--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "canonical_model_id" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "models_pricing_status_idx" ON "models" USING btree ("pricing_status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "model_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alias" text NOT NULL,
	"canonical_model_id" text NOT NULL,
	"provider_slug" text,
	"description" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "model_aliases_alias_uq" ON "model_aliases" USING btree ("alias");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "model_aliases_canonical_idx" ON "model_aliases" USING btree ("canonical_model_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "provider_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"provider_model_id" text NOT NULL,
	"input_cost_usd_cents_per_million" integer NOT NULL,
	"output_cost_usd_cents_per_million" integer NOT NULL,
	"cached_input_cost_usd_cents_per_million" integer,
	"source_url" text,
	"source_identifier" text,
	"currency" text DEFAULT 'USD' NOT NULL,
	"verification_timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "provider_costs" ADD CONSTRAINT "provider_costs_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "provider_costs_prov_model_uq" ON "provider_costs" USING btree ("provider_id", "provider_model_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pricing_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"input_usd_cents_per_million" integer NOT NULL,
	"output_usd_cents_per_million" integer NOT NULL,
	"cached_input_usd_cents_per_million" integer,
	"input_paise_per_million" integer NOT NULL,
	"output_paise_per_million" integer NOT NULL,
	"target_gross_margin_bp" integer DEFAULT 3000 NOT NULL,
	"operational_reserve_bp" integer DEFAULT 1000 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"approved_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pricing_versions" ADD CONSTRAINT "pricing_versions_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pricing_versions_model_idx" ON "pricing_versions" USING btree ("model_id", "version");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pricing_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_slug" text NOT NULL,
	"actor_userId" text,
	"action" text NOT NULL,
	"old_pricing" jsonb,
	"new_pricing" jsonb NOT NULL,
	"reason" text DEFAULT 'Admin pricing update' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pricing_audit_logs_slug_idx" ON "pricing_audit_logs" USING btree ("model_slug", "created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pricing_sync_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"sync_type" text DEFAULT 'manual' NOT NULL,
	"status" text NOT NULL,
	"models_updated" integer DEFAULT 0 NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pricing_sync_logs_provider_idx" ON "pricing_sync_logs" USING btree ("provider", "created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "exchange_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"base_currency" text DEFAULT 'USD' NOT NULL,
	"target_currency" text DEFAULT 'INR' NOT NULL,
	"rate" integer NOT NULL,
	"is_display_policy" boolean DEFAULT false NOT NULL,
	"source" text DEFAULT 'admin' NOT NULL,
	"effective_date" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exchange_rates_target_idx" ON "exchange_rates" USING btree ("target_currency", "effective_date");
