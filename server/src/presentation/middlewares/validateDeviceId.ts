import { FastifyRequest } from "fastify";
import { AppError } from "@/domain/errors/AppError";

// Estende o tipo FastifyRequest para incluir deviceId
declare module "fastify" {
  interface FastifyRequest {
    deviceId: string;
  }
}

/**
 * Middleware para validar o header X-Device-Id
 * Usado em rotas sensíveis que requerem identificação do dispositivo
 */
export function validateDeviceId(request: FastifyRequest) {
  const deviceId = request.headers["x-device-id"];

  if (!deviceId) {
    throw new AppError("X-Device-Id header is required", 400);
  }

  if (typeof deviceId !== "string") {
    throw new AppError("X-Device-Id must be a string", 400);
  }

  // Valida formato UUID v4
  const uuidV4Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidV4Regex.test(deviceId)) {
    throw new AppError("X-Device-Id must be a valid UUID v4", 400);
  }

  // Adiciona deviceId ao request para uso posterior
  request.deviceId = deviceId;
}
