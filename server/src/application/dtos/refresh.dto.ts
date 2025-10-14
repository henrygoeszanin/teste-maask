import { z } from "zod";

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(10).describe("Token de refresh JWT"),
});

export type RefreshTokenDTO = z.infer<typeof RefreshTokenSchema>;

export const RefreshTokenResponseSchema = z.object({
  accessToken: z.string().describe("Novo token de acesso JWT"),
  expiresIn: z.number().describe("Tempo de expiração em segundos"),
});

export const RefreshTokenErrorResponseSchema = z.object({
  error: z.string().describe("Mensagem de erro"),
});
