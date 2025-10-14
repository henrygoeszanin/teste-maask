import { FastifyInstance } from "fastify";
import { HealthController } from "../controllers/HealthController";
import { HealthResponseSchema } from "@/application/dtos/health.dto";
import { ZodTypeProvider } from "fastify-type-provider-zod";

export async function healthRoutes(app: FastifyInstance) {
  const healthController = new HealthController();

  app.withTypeProvider<ZodTypeProvider>().get(
    "/health",
    {
      schema: {
        tags: ["Health"],
        description: "Health check da API",
        response: {
          200: HealthResponseSchema,
        },
      },
    },
    healthController.check.bind(healthController)
  );
}
