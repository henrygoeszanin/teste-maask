import { Device } from "@/domain/entities/Devices";
import { IDeviceRepository } from "@/application/interfaces/IDeviceRepository";
import { AppError } from "@/domain/errors/AppError";

export interface RegisterDeviceInput {
  userId: string;
  deviceName: string;
}

export class RegisterDeviceUseCase {
  constructor(private deviceRepository: IDeviceRepository) {}

  async execute(input: RegisterDeviceInput): Promise<Device> {
    // Verifica se já existe um dispositivo com este deviceName
    const existingDevice = await this.deviceRepository.findByDeviceName(
      input.deviceName
    );

    if (existingDevice) {
      throw new AppError("Dispositivo já registrado com este deviceName", 409);
    }

    // Cria nova entidade de dispositivo
    const device = Device.create(input.userId, input.deviceName);

    // Salva no repositório
    const savedDevice = await this.deviceRepository.create(device);

    return savedDevice;
  }
}
