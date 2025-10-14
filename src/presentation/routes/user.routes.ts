import { FastifyInstance } from "fastify";
import { UserController } from "../controllers/UserController";
import { validateBody } from "../middlewares/validateBody";
import { RegisterSchema } from "@/application/dtos/user.dto";
import { RegisterUseCase } from "@/application/usecases/registerUseCase";

import { UserRepository } from "@/infrastructure/repositories/UserRepository";

export async function userRoutes(app: FastifyInstance) {
  const userRepository = new UserRepository();
  const userController = new UserController(
    new RegisterUseCase(userRepository)
  );

  app.post(
    "/",
    { preHandler: validateBody(RegisterSchema) },
    userController.create.bind(userController)
  );
}
