CREATE TABLE "devices" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"device_id" text NOT NULL,
	"public_key" text NOT NULL,
	"public_key_format" text NOT NULL,
	"key_fingerprint" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "envelopes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"device_id" text NOT NULL,
	"envelope_ciphertext" text NOT NULL,
	"encryption_metadata" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"file_id" text NOT NULL,
	"file_name" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage_path" text NOT NULL,
	"encrypted_fek" text NOT NULL,
	"encryption_metadata" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "files_file_id_unique" UNIQUE("file_id")
);
--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envelopes" ADD CONSTRAINT "envelopes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envelopes" ADD CONSTRAINT "envelopes_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;