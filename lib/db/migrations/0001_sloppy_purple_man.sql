CREATE TABLE "drop_secrets" (
	"drop_id" uuid PRIMARY KEY NOT NULL,
	"ip_hash" text NOT NULL,
	"edit_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"emoji" text NOT NULL,
	"word" text NOT NULL,
	"x" real DEFAULT 0 NOT NULL,
	"y" real DEFAULT 0 NOT NULL,
	"angle" real DEFAULT 0 NOT NULL,
	"settled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "drop_secrets" ADD CONSTRAINT "drop_secrets_drop_id_drops_id_fk" FOREIGN KEY ("drop_id") REFERENCES "public"."drops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "drop_secrets_ip_idx" ON "drop_secrets" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE INDEX "drops_created_idx" ON "drops" USING btree ("created_at");