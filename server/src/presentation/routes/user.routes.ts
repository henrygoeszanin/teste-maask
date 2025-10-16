import { FastifyInstance } from "fastify";
import { UserController } from "../controllers/UserController";
import { UserRepository } from "@/infrastructure/repositories/UserRepository";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { RegisterUseCase } from "@/application/usecases/RegisterUseCase";
import { UpdateUserUseCase } from "@/application/usecases/UpdateUserUseCase";
import { authenticate } from "../middlewares/authenticate";
import {
  RegisterSchema,
  UpdateUserSchema,
  UserResponseSchema,
  UserMeResponseSchema,
  ErrorResponseSchema,
} from "@application/dtos/user.dto";
import { withExamples } from "../utils";

export function userRoutes(app: FastifyInstance) {
  const userRepository = new UserRepository();
  const userController = new UserController(
    new RegisterUseCase(userRepository),
    new UpdateUserUseCase(userRepository)
  );

  // registra o novo SenhaDoUsuario123
  app.withTypeProvider<ZodTypeProvider>().post(
    "/",
    {
      schema: {
        tags: ["Users"],
        description: "Criar um novo usuário",
        body: withExamples(RegisterSchema, [
          {
            name: "João da Silva",
            email: "joao@email.com",
            password: "Senha123!",
          },
        ]),
        response: {
          201: withExamples(UserResponseSchema, [
            {
              message: "Usuário criado com sucesso",
              data: {
                id: "uuid-123",
                name: "João da Silva",
                email: "joao@email.com",
                createdAt: "2025-10-13T12:00:00.000Z",
                updatedAt: "2025-10-13T12:00:00.000Z",
              },
            },
          ]),
          409: withExamples(ErrorResponseSchema, [
            { error: "Email already registered" },
          ]),
        },
      },
    },
    userController.create.bind(userController)
  );

  // Rota protegida para atualizar o usuário logado
  app.withTypeProvider<ZodTypeProvider>().patch(
    "/me",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["Users"],
        description:
          "Atualizar dados do usuário autenticado (requer Bearer token)",
        body: withExamples(UpdateUserSchema, [
          {
            name: "Novo Nome",
            email: "novo@email.com",
          },
        ]),
        response: {
          200: withExamples(UserResponseSchema, [
            {
              message: "Usuário atualizado com sucesso",
              data: {
                id: "uuid-123",
                name: "Novo Nome",
                email: "novo@email.com",
                createdAt: "2025-10-13T12:00:00.000Z",
                updatedAt: "2025-10-13T12:10:00.000Z",
              },
            },
          ]),
          401: withExamples(ErrorResponseSchema, [
            { error: "Token not provided" },
          ]),
          404: withExamples(ErrorResponseSchema, [{ error: "User not found" }]),
          409: withExamples(ErrorResponseSchema, [
            { error: "This email is already in use" },
          ]),
        },
        security: [{ bearerAuth: [] }],
      },
    },
    userController.updateMe.bind(userController)
  );

  // Rota protegida para buscar dados do usuário autenticado
  app.withTypeProvider<ZodTypeProvider>().get(
    "/me",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["Users"],
        description:
          "Buscar dados do usuário autenticado (requer Bearer token)",
        response: {
          200: withExamples(UserMeResponseSchema, [
            {
              data: {
                id: "uuid-123",
                name: "João da Silva",
                email: "joao@email.com",
              },
            },
          ]),
          401: withExamples(ErrorResponseSchema, [
            { error: "Token not provided" },
          ]),
        },
        security: [{ bearerAuth: [] }],
      },
    },
    userController.me.bind(userController)
  );
}
