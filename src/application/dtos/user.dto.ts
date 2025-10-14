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
