CREATE TABLE IF NOT EXISTS "daily_free_token_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"day_key" text NOT NULL,
	"tokens_consumed" integer DEFAULT 0 NOT NULL,
	"tokens_reserved" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "daily_free_token_usage" ADD CONSTRAINT "daily_free_token_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "daily_free_token_usage_user_day_uq" ON "daily_free_token_usage" USING btree ("user_id", "day_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "daily_free_token_usage_user_idx" ON "daily_free_token_usage" USING btree ("user_id");
