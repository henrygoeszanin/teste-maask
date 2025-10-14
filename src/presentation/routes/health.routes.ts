import { FastifyInstance } from "fastify";
import { HealthController } from "../controllers/HealthController";

export async function healthRoutes(app: FastifyInstance) {
  const healthController = new HealthController();

  app.get("/health", healthController.check.bind(healthController));
}
