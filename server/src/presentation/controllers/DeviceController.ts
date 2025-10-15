import { FastifyReply, FastifyRequest } from "fastify";
import { RegisterDeviceUseCase } from "@/application/usecases/RegisterDeviceUseCase";
import { DeleteDeviceUseCase } from "@/application/usecases/DeleteDeviceUseCase";
import { DeviceRepository } from "@/infrastructure/repositories/DeviceRepository";
import {
  RegisterDeviceDTO,
  DeleteDeviceParamDTO,
  RevokeDeviceDTO,
} from "@/application/dtos/device.dto";
import { AppError } from "@/domain/errors/AppError";
import { UserRepository } from "@/infrastructure/repositories/UserRepository";
import { RevokeDeviceUseCase } from "@/application/usecases/RevokeDeviceUseCase";
import { SocketGateway } from "../gateways/SocketGateway";

export class DeviceController {
  constructor(private readonly websocketGateway: SocketGateway) {}
  /**
   * Registra um novo dispositivo para o usuário autenticado
   * @param request - Requisição Fastify contendo deviceName no body
   * @param reply - Resposta Fastify
   * @returns Retorna dados do dispositivo criado
   */
  async register(request: FastifyRequest, reply: FastifyReply) {
    try {
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
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      } else {
        return reply
          .status(500)
          .send({ error: "unknown error", details: String(error) });
      }
    }
  }

  /**
   * Lista todos os dispositivos do usuário autenticado
   * @param request - Requisição Fastify
   * @param reply - Resposta Fastify
   * @returns Retorna lista de dispositivos do usuário
   */
  async list(request: FastifyRequest, reply: FastifyReply) {
    try {
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
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      } else {
        return reply
          .status(500)
          .send({ error: "unknown error", details: String(error) });
      }
    }
  }

  /**
   * Busca um dispositivo específico por ID
   * @param request - Requisição Fastify contendo deviceId nos params
   * @param reply - Resposta Fastify
   * @returns Retorna dados do dispositivo ou erro 404 se não encontrado, erro 403 se não pertencer ao usuário
   */
  async getById(request: FastifyRequest, reply: FastifyReply) {
    try {
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
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      } else {
        return reply
          .status(500)
          .send({ error: "unknown error", details: String(error) });
      }
    }
  }

  /**
   * Revoga um dispositivo de forma segura.
   *
   * Proteções:
   * - Exige senha do usuário
   * - Dispositivo não pode revogar a si mesmo
   * - Notifica dispositivo revogado via Socket.IO em tempo real
   * @param request - Requisição Fastify contendo deviceName e password no body, x-device-name no header
   * @param reply - Resposta Fastify
   * @returns Retorna confirmação de revogação ou erro de validação/autorização
   */
  async revokeDevice(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
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

      await useCase.execute({
        userId,
        deviceNameToRevoke: body.deviceName,
        currentDeviceName,
        password: body.password,
        reason: body.reason ?? undefined,
      });

      // Notifica o dispositivo que está sendo revogado
      if (this.websocketGateway) {
        this.websocketGateway.notifyDeviceRevoked(userId, body.deviceName);
      } else {
        console.warn(
          "[DeviceRevocationController] SocketGateway não disponível - notificação em tempo real desabilitada"
        );
      }

      return reply.status(200).send({
        message: "Device revoked successfully",
        data: {
          deviceName: body.deviceName,
          revokedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      } else {
        return reply
          .status(500)
          .send({ error: "unknown error", details: String(error) });
      }
    }
  }

  /**
   * Deleta um dispositivo revogado
   * Apenas dispositivos com status "revoked" podem ser deletados
   * @param request - Requisição Fastify contendo deviceId nos params
   * @param reply - Resposta Fastify
   * @returns Retorna confirmação de deleção ou erro se dispositivo não encontrado, sem permissão ou não revogado
   */
  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.user?.id!;
      const { deviceId } = request.params as DeleteDeviceParamDTO;

      const deviceRepository = new DeviceRepository();
      const deleteDeviceUseCase = new DeleteDeviceUseCase(deviceRepository);

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
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      } else {
        return reply
          .status(500)
          .send({ error: "unknown error", details: String(error) });
      }
    }
  }
}
