import { FastifyReply, FastifyRequest } from "fastify";
import { CreateEnvelopeUseCase } from "@/application/usecases/CreateEnvelopeUseCase";
import { GetEnvelopeUseCase } from "@/application/usecases/GetEnvelopeUseCase";
import { EnvelopeRepository } from "@/infrastructure/repositories/EnvelopeRepository";
import { DeviceRepository } from "@/infrastructure/repositories/DeviceRepository";
import { CreateEnvelopeDTO } from "@/application/dtos/envelope.dto";

export class EnvelopeController {
  /**
   * Cria um novo envelope (sincroniza MDK para um dispositivo)
   */
  static async create(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.id!;
    const { deviceId, envelopeCiphertext, encryptionMetadata } =
      request.body as CreateEnvelopeDTO;

    const envelopeRepository = new EnvelopeRepository();
    const deviceRepository = new DeviceRepository();
    const createEnvelopeUseCase = new CreateEnvelopeUseCase(
      envelopeRepository,
      deviceRepository
    );

    const envelope = await createEnvelopeUseCase.execute({
      userId,
      deviceId,
      envelopeCiphertext,
      encryptionMetadata,
    });

    return reply.status(201).send({
      message: "Envelope criado com sucesso",
      data: {
        id: envelope.id,
        deviceId: envelope.deviceId,
        createdAt: envelope.createdAt.toISOString(),
      },
    });
  }

  /**
   * Obtém o envelope do dispositivo atual
   * Requer header X-Device-Id
   */
  static async getMyEnvelope(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.id!;
    const deviceId = request.headers["x-device-id"] as string;

    if (!deviceId) {
      return reply.status(400).send({
        error: "X-Device-Id header is required",
      });
    }

    const envelopeRepository = new EnvelopeRepository();
    const deviceRepository = new DeviceRepository();
    const getEnvelopeUseCase = new GetEnvelopeUseCase(
      envelopeRepository,
      deviceRepository
    );

    const envelope = await getEnvelopeUseCase.execute({
      userId,
      deviceId,
    });

    return reply.send({
      data: {
        id: envelope.id,
        envelopeCiphertext: envelope.envelopeCiphertext,
        encryptionMetadata: envelope.encryptionMetadata,
      },
    });
  }
}
