import { Device } from "@/domain/entities/Devices";
import { IDeviceRepository } from "@/application/interfaces/IDeviceRepository";

export interface RegisterDeviceInput {
  userId: string;
  deviceName: string;
}

export class RegisterDeviceUseCase {
  constructor(private deviceRepository: IDeviceRepository) {}

  async execute(input: RegisterDeviceInput): Promise<Device> {
    // Verifica se o usuário já possui um dispositivo com este deviceName
    const userDevices = await this.deviceRepository.findByUserId(input.userId);
    const existingDevice = userDevices.find(
      (device) => device.deviceName === input.deviceName
    );

    if (existingDevice) {
      // Se o dispositivo já existe e está revogado, reativa ele
      if (existingDevice.isRevoked()) {
        existingDevice.activate();
        return await this.deviceRepository.update(existingDevice);
      }

      // Se já está ativo, retorna o existente
      if (existingDevice.isActive()) {
        return existingDevice;
      }

      // Se está inativo, reativa
      existingDevice.activate();
      return await this.deviceRepository.update(existingDevice);
    }

    // Cria nova entidade de dispositivo
    const device = Device.create(input.userId, input.deviceName);

    // Salva no repositório
    const savedDevice = await this.deviceRepository.create(device);

    return savedDevice;
  }
}
