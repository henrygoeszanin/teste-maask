import { FastifyInstance } from "fastify";
import { UserController } from "../controllers/UserController";
import {
  RegisterSchema,
  UserResponseSchema,
  ErrorResponseSchema,
  UpdateUserSchema,
} from "@/application/dtos/user.dto";
import { UserRepository } from "@/infrastructure/repositories/UserRepository";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { RegisterUseCase } from "@/application/usecases/RegisterUseCase";
import { UpdateUserUseCase } from "@/application/usecases/UpdateUserUseCase";
import { authenticate } from "../middlewares/authenticate";
import { z } from "zod";

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
        body: RegisterSchema,
        response: {
          201: UserResponseSchema,
          409: ErrorResponseSchema,
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
        body: UpdateUserSchema,
        response: {
          200: z.object({
            message: z.string(),
            data: z.object({
              id: z.string(),
              name: z.string(),
              email: z.email(),
              createdAt: z.string(),
              updatedAt: z.string(),
            }),
          }),
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    userController.updateMe.bind(userController)
  );
}
