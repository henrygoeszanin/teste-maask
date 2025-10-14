import { FastifyInstance } from "fastify";
import { HealthController } from "../controllers/HealthController";
import {
  HealthResponseSchema,
  HealthFullResponseSchema,
} from "@/application/dtos/health.dto";
import { ZodTypeProvider } from "fastify-type-provider-zod";

export async function healthRoutes(app: FastifyInstance) {
  const healthController = new HealthController();

  app.withTypeProvider<ZodTypeProvider>().get(
    "/health",
    {
      schema: {
        tags: ["Health"],
        description:
          "Health check da API (inclui status e latência do banco de dados)",
        response: {
          200: HealthFullResponseSchema,
        },
      },
    },
    healthController.check.bind(healthController)
  );
}
