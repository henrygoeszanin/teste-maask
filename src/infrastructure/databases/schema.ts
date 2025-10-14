import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";

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
