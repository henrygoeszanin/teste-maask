import { FastifyInstance } from "fastify";
import { validateBody } from "../middlewares/validateBody";
import { LoginSchema } from "@/application/dtos/auth.dto";
import { AuthController } from "../controllers/AuthController";

export async function authRoutes(app: FastifyInstance) {
  const authController = new AuthController();

  app.post(
    "/auth/login",
    { preHandler: validateBody(LoginSchema) },
    authController.login.bind(authController)
  );
}
