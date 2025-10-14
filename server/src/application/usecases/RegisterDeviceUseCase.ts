import { Device } from "@/domain/entities/Devices";
import { IDeviceRepository } from "@/application/interfaces/IDeviceRepository";
import { AppError } from "@/domain/errors/AppError";

export interface RegisterDeviceInput {
  userId: string;
  deviceId: string;
  publicKey: string;
  publicKeyFormat: string;
  keyFingerprint: string;
}

export class RegisterDeviceUseCase {
  constructor(private deviceRepository: IDeviceRepository) {}

  async execute(input: RegisterDeviceInput): Promise<Device> {
    // Verifica se já existe um dispositivo com este deviceId
    const existingDevice = await this.deviceRepository.findByDeviceId(
      input.deviceId
    );

    if (existingDevice) {
      throw new AppError("Dispositivo já registrado com este deviceId", 409);
    }

    // Cria nova entidade de dispositivo
    const device = Device.create(
      input.userId,
      input.deviceId,
      input.publicKey,
      input.publicKeyFormat,
      input.keyFingerprint
    );

    // Salva no repositório
    const savedDevice = await this.deviceRepository.create(device);

    return savedDevice;
  }
}
