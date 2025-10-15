import { FastifyInstance } from "fastify";
import { AuthController } from "../controllers/AuthController";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  LoginSchema,
  LoginResponseSchema,
  AuthErrorResponseSchema,
} from "@application/dtos/auth.dto";
import {
  RefreshTokenSchema,
  RefreshTokenResponseSchema,
  RefreshTokenErrorResponseSchema,
} from "@application/dtos/refresh.dto";
import { withExamples } from "../utils";
import { authRateLimiter } from "../middlewares/rateLimiters";

export function authRoutes(app: FastifyInstance) {
  const authController = new AuthController();

  app.withTypeProvider<ZodTypeProvider>().post(
    "/auth/login",
    {
      config: {
        rateLimit: authRateLimiter,
      },
      schema: {
        tags: ["Auth"],
        description:
          "Autenticar usuário e obter tokens JWT (rate limit: 5 tentativas / 15 min)",
        body: withExamples(LoginSchema, [
          {
            email: "usuario@email.com",
            password: "Senha123!",
          },
        ]),
        response: {
          200: withExamples(LoginResponseSchema, [
            {
              accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
              refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
              expiresIn: 3600,
              refreshExpiresIn: 604800,
              user: {
                id: "uuid-123",
                name: "Usuário Teste",
                email: "usuario@email.com",
              },
            },
          ]),
          401: withExamples(AuthErrorResponseSchema, [
            { error: "Invalid username or password" },
          ]),
          429: withExamples(AuthErrorResponseSchema, [
            {
              error:
                "Too many authentication attempts. Please try again later.",
            },
          ]),
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
        body: withExamples(RefreshTokenSchema, [
          {
            refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          },
        ]),
        response: {
          200: withExamples(RefreshTokenResponseSchema, [
            {
              accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
              expiresIn: 3600,
            },
          ]),
          401: withExamples(RefreshTokenErrorResponseSchema, [
            { error: "Invalid or expired refresh token" },
          ]),
        },
      },
    },
    authController.refresh.bind(authController)
  );
}
