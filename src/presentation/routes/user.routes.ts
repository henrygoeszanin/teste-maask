import { FastifyInstance } from "fastify";
import { UserController } from "../controllers/UserController";
import {
  RegisterSchema,
  UserResponseSchema,
  ErrorResponseSchema,
} from "@/application/dtos/user.dto";
import { UserRepository } from "@/infrastructure/repositories/UserRepository";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { RegisterUseCase } from "@/application/usecases/RegisterUseCase";

export async function userRoutes(app: FastifyInstance) {
  const userRepository = new UserRepository();
  const userController = new UserController(
    new RegisterUseCase(userRepository)
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
}
