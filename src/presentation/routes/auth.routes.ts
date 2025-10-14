import { FastifyInstance } from "fastify";
import {
  LoginSchema,
  LoginResponseSchema,
  AuthErrorResponseSchema,
} from "@/application/dtos/auth.dto";
import {
  RefreshTokenSchema,
  RefreshTokenResponseSchema,
  RefreshTokenErrorResponseSchema,
} from "@/application/dtos/refresh.dto";
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

  app.withTypeProvider<ZodTypeProvider>().post(
    "/auth/refresh",
    {
      schema: {
        tags: ["Auth"],
        description: "Gerar novo accessToken a partir do refreshToken",
        body: RefreshTokenSchema,
        response: {
          200: RefreshTokenResponseSchema,
          401: RefreshTokenErrorResponseSchema,
        },
      },
    },
    authController.refresh.bind(authController)
  );
}
