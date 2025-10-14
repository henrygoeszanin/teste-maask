import { z } from "zod";

export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export type LoginDTO = z.infer<typeof LoginSchema>;

// Response schema for login
export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
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
  error: z.string(),
});
