import { FastifyRequest, FastifyReply } from "fastify";
import { AppError } from "@/domain/errors/AppError";

/**
 * Middleware para validar o header X-Device-Id
 * Usado em rotas sensíveis que requerem identificação do dispositivo
 */
export async function validateDeviceId(
  request: FastifyRequest,
  reply: FastifyReply
) {
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
  (request as any).deviceId = deviceId;
}
