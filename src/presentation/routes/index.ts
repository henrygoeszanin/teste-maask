import { FastifyInstance } from "fastify";

import { healthRoutes } from "./health.routes";
import { userRoutes } from "./user.routes";

export async function registerRoutes(app: FastifyInstance) {
  app.register(healthRoutes, { prefix: "/api" });
  app.register(userRoutes, { prefix: "/api/users" });
}
