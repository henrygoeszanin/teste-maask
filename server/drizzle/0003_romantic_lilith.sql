ALTER TABLE "files" RENAME COLUMN "encryption_metadata" TO "fek_encryption_metadata";--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "file_encryption_metadata" jsonb NOT NULL;