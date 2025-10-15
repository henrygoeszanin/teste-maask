import { FastifyReply, FastifyRequest } from "fastify";
import { RegisterDeviceUseCase } from "@/application/usecases/RegisterDeviceUseCase";
import { DeleteDeviceUseCase } from "@/application/usecases/DeleteDeviceUseCase";
import { DeviceRepository } from "@/infrastructure/repositories/DeviceRepository";
import {
  RegisterDeviceDTO,
  DeleteDeviceParamDTO,
} from "@/application/dtos/device.dto";

export class DeviceController {
  /**
   * Registra um novo dispositivo para o usuário autenticado
   */
  static async register(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.id!;
    const { deviceName } = request.body as RegisterDeviceDTO;

    const deviceRepository = new DeviceRepository();
    const registerDeviceUseCase = new RegisterDeviceUseCase(deviceRepository);

    const device = await registerDeviceUseCase.execute({
      userId,
      deviceName,
    });

    return reply.status(201).send({
      id: device.id,
      deviceName: device.deviceName,
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
        deviceName: device.deviceName,
        status: device.status,
        createdAt: device.createdAt.toISOString(),
        updatedAt: device.updatedAt.toISOString(),
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
        deviceName: device.deviceName,
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
    const { deviceName } = request.params as { deviceName: string };

    const deviceRepository = new DeviceRepository();

    // Busca o dispositivo
    const device = await deviceRepository.findByDeviceName(deviceName);

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

    // Revoga o dispositivo
    device.revoke();
    await deviceRepository.update(device);

    return reply.send({
      message: "Device revoked successfully",
      deviceName: device.deviceName,
      status: device.status,
    });
  }

  /**
   * Deleta um dispositivo revogado
   * Apenas dispositivos com status "revoked" podem ser deletados
   */
  static async delete(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.id!;
    const { deviceId } = request.params as DeleteDeviceParamDTO;

    const deviceRepository = new DeviceRepository();
    const deleteDeviceUseCase = new DeleteDeviceUseCase(deviceRepository);

    try {
      const result = await deleteDeviceUseCase.execute({
        userId,
        deviceId,
      });

      return reply.status(200).send({
        message: "Dispositivo deletado com sucesso",
        data: {
          deviceId: result.deviceId,
          deviceName: result.deviceName,
          deletedAt: result.deletedAt.toISOString(),
        },
      });
    } catch (error: any) {
      console.error("[DeviceController] Error deleting device:", error);

      if (error.message?.includes("not found")) {
        return reply.status(404).send({ error: error.message });
      }

      if (error.message?.includes("Unauthorized")) {
        return reply.status(403).send({ error: error.message });
      }

      if (error.message?.includes("Only revoked devices")) {
        return reply.status(400).send({ error: error.message });
      }

      if (error.statusCode) {
        return reply.status(error.statusCode).send({ error: error.message });
      }

      return reply.status(500).send({
        error: "Failed to delete device. Please try again.",
      });
    }
  }
}
