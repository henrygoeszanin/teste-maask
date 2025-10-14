ALTER TABLE "devices" ADD COLUMN "is_master_device" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "revoked_at" timestamp;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "revoked_by" text;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "revocation_reason" text;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "last_seen" timestamp;