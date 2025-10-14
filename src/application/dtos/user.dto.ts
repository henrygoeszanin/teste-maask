import { z } from "zod";

export const UpdateUserSchema = z.object({
  name: z.string().optional(),
  email: z.email().optional(),
});
export type UpdateUserDTO = z.infer<typeof UpdateUserSchema>;

export const RegisterSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.email(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, {
      message: "Password must contain at least one uppercase letter",
    })
    .regex(/[0-9]/, { message: "Password must contain at least one number" })
    .regex(/[\W_]/, {
      message: "Password must contain at least one special character",
    }),
});

export type RegisterDTO = z.infer<typeof RegisterSchema>;

// Response schema for created user
export const UserResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    id: z.string(),
    name: z.string(),
    email: z.email(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
});

export const ErrorResponseSchema = z.object({
  error: z.string(),
});
