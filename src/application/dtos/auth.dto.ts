import { z } from "zod";

export const LoginSchema = z.object({
  password: z.string().min(8),
  email: z.email(),
});

export type LoginDTO = z.infer<typeof LoginSchema>;
