import { FastifyReply, FastifyRequest } from "fastify";
import { RevokeDeviceUseCase } from "@/application/usecases/RevokeDeviceUseCase";
import { DeviceRepository } from "@/infrastructure/repositories/DeviceRepository";
import { EnvelopeRepository } from "@/infrastructure/repositories/EnvelopeRepository";
import { UserRepository } from "@/infrastructure/repositories/UserRepository";
import { RevokeDeviceDTO } from "@/application/dtos/device.dto";

export class DeviceRevocationController {
  /**
   * Revoga um dispositivo de forma segura.
   *
   * Proteções:
   * - Exige senha do usuário
   * - Dispositivo não pode revogar a si mesmo
   * - Apenas master devices podem revogar outros master devices
   * - Último master device não pode ser revogado
   */
  static async revokeDevice(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const body = request.body as RevokeDeviceDTO;
    const userId = request.user!.id;

    // Extrai deviceId do header X-Device-Id (dispositivo que está fazendo a revogação)
    const currentDeviceId = request.headers["x-device-id"] as string;

    if (!currentDeviceId) {
      return reply.status(400).send({
        error: "Missing X-Device-Id header",
      });
    }

    const deviceRepository = new DeviceRepository();
    const envelopeRepository = new EnvelopeRepository();
    const userRepository = new UserRepository();

    const useCase = new RevokeDeviceUseCase(
      deviceRepository,
      envelopeRepository,
      userRepository
    );

    await useCase.execute({
      userId,
      deviceIdToRevoke: body.deviceId,
      currentDeviceId,
      password: body.password,
      reason: body.reason,
    });

    return reply.status(200).send({
      message: "Device revoked successfully",
      data: {
        deviceId: body.deviceId,
        revokedAt: new Date().toISOString(),
      },
    });
  }
}
