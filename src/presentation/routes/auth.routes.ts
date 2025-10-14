import { FastifyInstance } from "fastify";
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
        body: {
          type: "object",
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8 },
          },
          required: ["email", "password"],
          example: {
            email: "usuario@email.com",
            password: "Senha123!",
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              accessToken: { type: "string" },
              refreshToken: { type: "string" },
              expiresIn: {
                type: "number",
                description: "Tempo de expiração do accessToken em segundos",
              },
              refreshExpiresIn: {
                type: "number",
                description: "Tempo de expiração do refreshToken em segundos",
              },
              user: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                },
              },
            },
            example: {
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
          },
          401: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
            example: { error: "Usuário ou senha inválidos" },
          },
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
        body: {
          type: "object",
          properties: {
            refreshToken: { type: "string" },
          },
          required: ["refreshToken"],
          example: {
            refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              accessToken: { type: "string" },
              expiresIn: {
                type: "number",
                description: "Tempo de expiração do accessToken em segundos",
              },
            },
            example: {
              accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
              expiresIn: 3600,
            },
          },
          401: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
            example: { error: "Refresh token inválido ou expirado" },
          },
        },
      },
    },
    authController.refresh.bind(authController)
  );
}
