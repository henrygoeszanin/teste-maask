import { FastifyReply, FastifyRequest } from "fastify";
import { RegisterDeviceUseCase } from "@/application/usecases/RegisterDeviceUseCase";
import { DeviceRepository } from "@/infrastructure/repositories/DeviceRepository";
import { RegisterDeviceDTO } from "@/application/dtos/device.dto";

export class DeviceController {
  /**
   * Registra um novo dispositivo para o usuário autenticado
   */
  static async register(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.id!;
    const { deviceId, publicKey, publicKeyFormat, keyFingerprint } =
      request.body as RegisterDeviceDTO;

    const deviceRepository = new DeviceRepository();
    const registerDeviceUseCase = new RegisterDeviceUseCase(deviceRepository);

    const device = await registerDeviceUseCase.execute({
      userId,
      deviceId,
      publicKey,
      publicKeyFormat,
      keyFingerprint,
    });

    return reply.status(201).send({
      id: device.id,
      deviceId: device.deviceId,
      status: device.status,
      createdAt: device.createdAt.toISOString(),
    });
  }

  /**
   * Lista todos os dispositivos do usuário autenticado
   */
  static async list(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.id!;

    const deviceRepository = new DeviceRepository();
    const devices = await deviceRepository.findByUserId(userId);

    return reply.send({
      devices: devices.map((device) => ({
        id: device.id,
        deviceId: device.deviceId,
        keyFingerprint: device.keyFingerprint,
        status: device.status,
        createdAt: device.createdAt.toISOString(),
      })),
    });
  }

  /**
   * Busca um dispositivo específico por ID
   */
  static async getById(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.id!;
    const { id } = request.params as { id: string };

    const deviceRepository = new DeviceRepository();
    const device = await deviceRepository.findById(id);

    if (!device) {
      return reply.status(404).send({
        error: "Device not found",
      });
    }

    // Verifica se pertence ao usuário
    if (device.userId !== userId) {
      return reply.status(403).send({
        error: "You do not have permission to access this device",
      });
    }

    return reply.send({
      data: {
        id: device.id,
        deviceId: device.deviceId,
        publicKey: device.publicKey,
        publicKeyFormat: device.publicKeyFormat,
        keyFingerprint: device.keyFingerprint,
        status: device.status,
        createdAt: device.createdAt.toISOString(),
      },
    });
  }

  /**
   * Revoga (desativa) um dispositivo
   */
  static async revoke(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.id!;
    const { deviceId } = request.params as { deviceId: string };

    const deviceRepository = new DeviceRepository();

    // Busca o dispositivo
    const device = await deviceRepository.findByDeviceId(deviceId);

    if (!device) {
      return reply.status(404).send({
        error: "Device not found",
      });
    }

    // Verifica se pertence ao usuário
    if (device.userId !== userId) {
      return reply.status(403).send({
        error: "You do not have permission to revoke this device",
      });
    }

    // Desativa o dispositivo
    device.deactivate();
    await deviceRepository.update(device);

    return reply.send({
      message: "Device revoked successfully",
      deviceId: device.deviceId,
      status: device.status,
    });
  }
}
