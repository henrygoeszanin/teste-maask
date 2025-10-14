import { z } from "zod";

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(10),
});

export type RefreshTokenDTO = z.infer<typeof RefreshTokenSchema>;

export const RefreshTokenResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number(),
});

export const RefreshTokenErrorResponseSchema = z.object({
  error: z.string(),
});
