import { FastifyInstance } from "fastify";
import { SocketGateway } from "@/presentation/gateways/SocketGateway";

import { healthRoutes } from "./health.routes";
import { userRoutes } from "./user.routes";
import { authRoutes } from "./auth.routes";
import { deviceRoutes } from "./device.routes";
import { fileRoutes } from "./file.routes";

export function registerRoutes(
  app: FastifyInstance,
  socketGateway: SocketGateway
) {
  app.register(healthRoutes, { prefix: "/api" });
  app.register(userRoutes, { prefix: "/api/users" });
  app.register(authRoutes, { prefix: "/api" });
  app.register(deviceRoutes, { prefix: "/api", socketGateway });
  app.register(fileRoutes, { prefix: "/api" });
}
