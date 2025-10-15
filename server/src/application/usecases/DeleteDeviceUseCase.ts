import { IDeviceRepository } from "@/application/interfaces/IDeviceRepository";
import { AppError } from "@/domain/errors/AppError";

export interface DeleteDeviceInput {
  userId: string;
  deviceId: string;
}

export interface DeleteDeviceOutput {
  deviceId: string;
  deviceName: string;
  deletedAt: Date;
}

/**
 * Caso de uso para deletar um dispositivo revogado
 * Apenas dispositivos com status "revoked" podem ser deletados
 */
export class DeleteDeviceUseCase {
  constructor(private deviceRepository: IDeviceRepository) {}

  async execute(input: DeleteDeviceInput): Promise<DeleteDeviceOutput> {
    const { userId, deviceId } = input;

    // Busca dispositivo
    const device = await this.deviceRepository.findById(deviceId);

    if (!device) {
      throw new AppError("Device not found", 404);
    }

    // Verifica se pertence ao usuário
    if (device.userId !== userId) {
      throw new AppError("Unauthorized to delete this device", 403);
    }

    // Verifica se está revogado
    if (!device.isRevoked()) {
      throw new AppError(
        "Only revoked devices can be deleted. Revoke the device first.",
        400
      );
    }

    // Deleta o dispositivo
    await this.deviceRepository.delete(device.id);

    console.log(
      `[DeleteDevice] Device ${device.deviceName} (${deviceId}) deleted by user ${userId}`
    );

    return {
      deviceId: device.id,
      deviceName: device.deviceName,
      deletedAt: new Date(),
    };
  }
}
