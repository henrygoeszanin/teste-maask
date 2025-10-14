import { z } from "zod";

export const UpdateUserSchema = z.object({
  name: z.string().optional().describe("Nome do usuário"),
});

export type UpdateUserDTO = z.infer<typeof UpdateUserSchema>;

export const RegisterSchema = z.object({
  name: z.string().min(2).max(100).describe("Nome completo do usuário"),
  email: z.email().describe("E-mail do usuário"),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, {
      message: "Password must contain at least one uppercase letter",
    })
    .regex(/[0-9]/, { message: "Password must contain at least one number" })
    .regex(/[\W_]/, {
      message: "Password must contain at least one special character",
    })
    .describe("Senha (mínimo 8 caracteres, 1 maiúscula, 1 número, 1 especial)"),
});

export type RegisterDTO = z.infer<typeof RegisterSchema>;

// Response schemas
const UserDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  createdAt: z.string(),
  updatedAt: z.string(),
  criptografyCode: z.string(),
});

export const UserResponseSchema = z.object({
  message: z.string(),
  criptografyCode: z.string(),
  data: UserDataSchema,
});

export const UserMeResponseSchema = z.object({
  data: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
  }),
});

export const ErrorResponseSchema = z.object({
  error: z.string().describe("Mensagem de erro"),
});
