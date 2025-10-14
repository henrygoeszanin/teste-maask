import { FastifyInstance } from "fastify";
import {
  LoginSchema,
  LoginResponseSchema,
  AuthErrorResponseSchema,
} from "@/application/dtos/auth.dto";
import { AuthController } from "../controllers/AuthController";
import { ZodTypeProvider } from "fastify-type-provider-zod";

export async function authRoutes(app: FastifyInstance) {
  const authController = new AuthController();

  app.withTypeProvider<ZodTypeProvider>().post(
    "/auth/login",
    {
      schema: {
        tags: ["Auth"],
        description: "Autenticar usuário e obter tokens JWT",
        body: LoginSchema,
        response: {
          200: LoginResponseSchema,
          401: AuthErrorResponseSchema,
        },
      },
    },
    authController.login.bind(authController)
  );
}
