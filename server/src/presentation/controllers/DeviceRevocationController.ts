import { FastifyReply, FastifyRequest } from "fastify";
import { RevokeDeviceUseCase } from "@/application/usecases/RevokeDeviceUseCase";
import { DeviceRepository } from "@/infrastructure/repositories/DeviceRepository";
import { UserRepository } from "@/infrastructure/repositories/UserRepository";
import { RevokeDeviceDTO } from "@/application/dtos/device.dto";

export class DeviceRevocationController {
  /**
   * Revoga um dispositivo de forma segura.
   *
   * Proteções:
   * - Exige senha do usuário
   * - Dispositivo não pode revogar a si mesmo
   */
  static async revokeDevice(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const body = request.body as RevokeDeviceDTO;
    const userId = request.user!.id;

    // Extrai deviceName do header X-Device-Name (dispositivo que está fazendo a revogação)
    const currentDeviceName = request.headers["x-device-name"] as string;

    if (!currentDeviceName) {
      return reply.status(400).send({
        error: "Missing X-Device-Name header",
      });
    }

    const deviceRepository = new DeviceRepository();
    const userRepository = new UserRepository();

    const useCase = new RevokeDeviceUseCase(deviceRepository, userRepository);

    try {
      await useCase.execute({
        userId,
        deviceNameToRevoke: body.deviceName,
        currentDeviceName,
        password: body.password,
        reason: body.reason,
      });

      return reply.status(200).send({
        message: "Device revoked successfully",
        data: {
          deviceName: body.deviceName,
          revokedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error("[DeviceRevocationController] Error:", error);

      // Erros específicos do use case
      if (error.message?.includes("Invalid password")) {
        return reply.status(401).send({ error: error.message });
      }

      if (error.message?.includes("not found")) {
        return reply.status(404).send({ error: error.message });
      }

      if (error.message?.includes("Cannot revoke your current device")) {
        return reply.status(400).send({ error: error.message });
      }

      if (error.statusCode) {
        return reply.status(error.statusCode).send({ error: error.message });
      }

      // Erro genérico
      return reply.status(500).send({
        error: "Failed to revoke device. Please try again.",
      });
    }
  }
}
