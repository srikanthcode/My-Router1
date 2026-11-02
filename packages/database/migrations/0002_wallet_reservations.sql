CREATE TABLE IF NOT EXISTS "wallet_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"request_id" text NOT NULL,
	"amount_paise" bigint NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"settled_paise" bigint DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wallet_reservations" ADD CONSTRAINT "wallet_reservations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wallet_res_user_idx" ON "wallet_reservations" USING btree ("user_id", "status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wallet_res_req_uq" ON "wallet_reservations" USING btree ("request_id");
