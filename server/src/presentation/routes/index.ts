import { FastifyInstance } from "fastify";

import { healthRoutes } from "./health.routes";
import { userRoutes } from "./user.routes";
import { authRoutes } from "./auth.routes";
import { deviceRoutes } from "./device.routes";
import { envelopeRoutes } from "./envelope.routes";
import { fileRoutes } from "./file.routes";

export async function registerRoutes(app: FastifyInstance) {
  app.register(healthRoutes, { prefix: "/api" });
  app.register(userRoutes, { prefix: "/api/users" });
  app.register(authRoutes, { prefix: "/api" });
  app.register(deviceRoutes, { prefix: "/api" });
  app.register(envelopeRoutes, { prefix: "/api" });
  app.register(fileRoutes, { prefix: "/api" });
}
