import { pgTable, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  pepperVersion: integer("pepper_version").notNull(),
  memoryCost: integer("memory_cost").notNull(),
  timeCost: integer("time_cost").notNull(),
  parallelism: integer("parallelism").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const devices = pgTable("devices", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  deviceId: text("device_id").notNull(),
  publicKey: text("public_key").notNull(),
  publicKeyFormat: text("public_key_format").notNull(),
  keyFingerprint: text("key_fingerprint").notNull(),
  status: text("status", { enum: ["active", "inactive", "revoked"] }).notNull(),
  isMasterDevice: integer("is_master_device").default(0).notNull(), // 0 = false, 1 = true (SQLite compatibility)
  revokedAt: timestamp("revoked_at"),
  revokedBy: text("revoked_by"), // deviceId que executou a revogação
  revocationReason: text("revocation_reason"),
  lastSeen: timestamp("last_seen"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const envelopes = pgTable("envelopes", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  deviceId: text("device_id")
    .notNull()
    .references(() => devices.id),
  envelopeCiphertext: text("envelope_ciphertext").notNull(),
  encryptionMetadata: jsonb("encryption_metadata").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const files = pgTable("files", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  fileId: text("file_id").notNull().unique(),
  fileName: text("file_name").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  storagePath: text("storage_path").notNull(),
  encryptedFek: text("encrypted_fek").notNull(),
  fekEncryptionMetadata: jsonb("fek_encryption_metadata").notNull(), // Metadados da criptografia da FEK
  fileEncryptionMetadata: jsonb("file_encryption_metadata").notNull(), // Metadados da criptografia do arquivo
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
