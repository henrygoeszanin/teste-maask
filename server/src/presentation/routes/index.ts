import { FastifyInstance } from "fastify";
import { SocketGateway } from "@/presentation/gateways/SocketGateway";

import { healthRoutes } from "./healthRoutes";
import { userRoutes } from "./userRoutes";
import { authRoutes } from "./authRoutes";
import { deviceRoutes } from "./deviceRoutes";
import { fileRoutes } from "./fileRoutes";

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
