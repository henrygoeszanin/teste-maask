import { Envelope } from "@/domain/entities/Envelope";
import { IEnvelopeRepository } from "@/application/interfaces/IEnvelopeRepository";
import { IDeviceRepository } from "@/application/interfaces/IDeviceRepository";
import { AppError } from "@/domain/errors/AppError";
import { NotFoundError } from "@/domain/errors/NotFoundError";

export interface CreateEnvelopeInput {
  userId: string;
  deviceId: string;
  envelopeCiphertext: string;
  encryptionMetadata: {
    algorithm: string;
    hashFunction: string;
  };
}

export class CreateEnvelopeUseCase {
  constructor(
    private envelopeRepository: IEnvelopeRepository,
    private deviceRepository: IDeviceRepository
  ) {}

  async execute(input: CreateEnvelopeInput): Promise<Envelope> {
    // Verifica se o dispositivo existe e está ativo
    const device = await this.deviceRepository.findByDeviceId(input.deviceId);

    if (!device) {
      throw new NotFoundError("Dispositivo não encontrado");
    }

    if (!device.isActive()) {
      throw new AppError("Dispositivo está inativo", 403);
    }

    // Verifica se o dispositivo pertence ao usuário
    if (device.userId !== input.userId) {
      throw new AppError("Dispositivo não pertence ao usuário", 403);
    }

    // Verifica se já existe um envelope para este dispositivo
    const existingEnvelope =
      await this.envelopeRepository.findByUserIdAndDeviceId(
        input.userId,
        device.id
      );

    if (existingEnvelope) {
      throw new AppError("Já existe um envelope para este dispositivo", 409);
    }

    // Cria novo envelope
    const envelope = Envelope.create(
      input.userId,
      device.id, // Usa o ID interno do device, não o deviceId
      input.envelopeCiphertext,
      input.encryptionMetadata
    );

    // Salva no repositório
    const savedEnvelope = await this.envelopeRepository.create(envelope);

    return savedEnvelope;
  }
}
