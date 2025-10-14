import { Envelope } from "@/domain/entities/Envelope";
import { IEnvelopeRepository } from "@/application/interfaces/IEnvelopeRepository";
import { IDeviceRepository } from "@/application/interfaces/IDeviceRepository";
import { NotFoundError } from "@/domain/errors/NotFoundError";
import { AppError } from "@/domain/errors/AppError";

export interface GetEnvelopeInput {
  userId: string;
  deviceId: string; // deviceId do cliente (UUID)
}

export class GetEnvelopeUseCase {
  constructor(
    private envelopeRepository: IEnvelopeRepository,
    private deviceRepository: IDeviceRepository
  ) {}

  async execute(input: GetEnvelopeInput): Promise<Envelope> {
    // Busca o dispositivo pelo deviceId
    const device = await this.deviceRepository.findByDeviceId(input.deviceId);

    if (!device) {
      throw new NotFoundError("Dispositivo não encontrado");
    }

    // Verifica se o dispositivo pertence ao usuário
    if (device.userId !== input.userId) {
      throw new AppError(
        "Dispositivo não pertence ao usuário autenticado",
        403
      );
    }

    // Verifica se o dispositivo está ativo
    if (!device.isActive()) {
      throw new AppError("Dispositivo está inativo", 403);
    }

    // Busca o envelope
    const envelope = await this.envelopeRepository.findByUserIdAndDeviceId(
      input.userId,
      device.id
    );

    if (!envelope) {
      throw new AppError(
        "MDK not found for this device. Please set up this device first or sync from another device.",
        404
      );
    }

    return envelope;
  }
}
