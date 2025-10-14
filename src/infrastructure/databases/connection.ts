import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "@config/index";

const client = postgres(config.database.url);
export const db = drizzle(client);
