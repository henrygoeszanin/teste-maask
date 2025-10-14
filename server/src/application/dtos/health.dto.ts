import { z } from "zod";

export const HealthResponseSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
});

export const HealthDbSchema = z.object({
  status: z.string(),
  latencyMs: z.number().nullable(),
});

export const HealthFullResponseSchema = HealthResponseSchema.extend({
  database: HealthDbSchema,
});
