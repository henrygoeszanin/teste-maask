import { FastifyInstance } from "fastify";
import { UserController } from "../controllers/UserController";
import { UserRepository } from "@/infrastructure/repositories/UserRepository";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { RegisterUseCase } from "@/application/usecases/RegisterUseCase";
import { UpdateUserUseCase } from "@/application/usecases/UpdateUserUseCase";
import { authenticate } from "../middlewares/authenticate";

export async function userRoutes(app: FastifyInstance) {
  const userRepository = new UserRepository();
  const userController = new UserController(
    new RegisterUseCase(userRepository),
    new UpdateUserUseCase(userRepository)
  );

  app.withTypeProvider<ZodTypeProvider>().post(
    "/",
    {
      schema: {
        tags: ["Users"],
        description: "Criar um novo usuário",
        body: {
          type: "object",
          properties: {
            name: { type: "string" },
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8 },
          },
          required: ["name", "email", "password"],
          example: {
            name: "João da Silva",
            email: "joao@email.com",
            password: "Senha123!",
          },
        },
        response: {
          201: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                  createdAt: { type: "string", format: "date-time" },
                  updatedAt: { type: "string", format: "date-time" },
                },
              },
            },
            example: {
              message: "Usuário criado com sucesso",
              data: {
                id: "uuid-123",
                name: "João da Silva",
                email: "joao@email.com",
                createdAt: "2025-10-13T12:00:00.000Z",
                updatedAt: "2025-10-13T12:00:00.000Z",
              },
            },
          },
          409: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
            example: { error: "E-mail já cadastrado" },
          },
        },
      },
    },
    userController.create.bind(userController)
  );

  // Rota protegida para atualizar o usuário logado
  app.withTypeProvider<ZodTypeProvider>().patch(
    "/me",
    {
      preHandler: authenticate,
      schema: {
        tags: ["Users"],
        description:
          "Atualizar dados do usuário autenticado (requer Bearer token)",
        body: {
          type: "object",
          properties: {
            name: { type: "string" },
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8 },
          },
          example: {
            name: "Novo Nome",
            email: "novo@email.com",
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                  createdAt: { type: "string", format: "date-time" },
                  updatedAt: { type: "string", format: "date-time" },
                },
              },
            },
            example: {
              message: "Usuário atualizado com sucesso",
              data: {
                id: "uuid-123",
                name: "Novo Nome",
                email: "novo@email.com",
                createdAt: "2025-10-13T12:00:00.000Z",
                updatedAt: "2025-10-13T12:10:00.000Z",
              },
            },
          },
          401: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
            example: { error: "Token não fornecido" },
          },
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
            example: { error: "Usuário não encontrado" },
          },
          409: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
            example: { error: "Este e-mail já está em uso" },
          },
        },
      },
    },
    userController.updateMe.bind(userController)
  );

  // Rota protegida para buscar dados do usuário autenticado
  app.withTypeProvider<ZodTypeProvider>().get(
    "/me",
    {
      preHandler: authenticate,
      schema: {
        tags: ["Users"],
        description:
          "Buscar dados do usuário autenticado (requer Bearer token)",
        response: {
          200: {
            type: "object",
            properties: {
              data: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                },
              },
            },
            example: {
              data: {
                id: "uuid-123",
                name: "João da Silva",
                email: "joao@email.com",
              },
            },
          },
          401: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
            example: { error: "Token não fornecido" },
          },
        },
        security: [{ bearerAuth: [] }],
      },
    },
    userController.me.bind(userController)
  );
}
