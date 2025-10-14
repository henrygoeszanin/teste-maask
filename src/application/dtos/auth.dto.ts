import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email().describe("E-mail do usuário"),
  password: z
    .string()
    .min(8)
    .describe("Senha do usuário (mínimo 8 caracteres)"),
});

export type LoginDTO = z.infer<typeof LoginSchema>;

// Response schema for login
export const LoginResponseSchema = z.object({
  accessToken: z.string().describe("Token de acesso JWT"),
  refreshToken: z.string().describe("Token de refresh JWT"),
  expiresIn: z
    .number()
    .describe("Tempo de expiração do accessToken em segundos"),
  refreshExpiresIn: z
    .number()
    .describe("Tempo de expiração do refreshToken em segundos"),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
  }),
});

export const AuthErrorResponseSchema = z.object({
  error: z.string().describe("Mensagem de erro"),
});
