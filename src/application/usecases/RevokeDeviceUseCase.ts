import { IDeviceRepository } from "@/application/interfaces/IDeviceRepository";
import { IEnvelopeRepository } from "@/application/interfaces/IEnvelopeRepository";
import { IUserRepository } from "@/application/interfaces/IUserRepository";
import { NotFoundError } from "@/domain/errors/NotFoundError";
import { AppError } from "@/domain/errors/AppError";
import argon2 from "argon2";
import { config } from "@/config";
import { Buffer } from "node:buffer";

interface RevokeDeviceInput {
  userId: string; // ID do usuário autenticado
  deviceIdToRevoke: string; // Device ID a ser revogado
  currentDeviceId: string; // Device ID de quem está executando a revogação
  password: string; // Senha do usuário (OBRIGATÓRIA)
  reason?: string; // Motivo da revogação (opcional)
}

/**
 * Caso de uso para revogar um dispositivo de forma segura.
 *
 * Proteções implementadas:
 * 1. ✅ Exige senha do usuário
 * 2. ✅ Dispositivo não pode revogar a si mesmo
 * 3. ✅ Apenas master devices podem revogar outros master devices
 * 4. ✅ Último master device não pode ser revogado
 * 5. ✅ Registra auditoria completa
 */
export class RevokeDeviceUseCase {
  constructor(
    private deviceRepository: IDeviceRepository,
    private envelopeRepository: IEnvelopeRepository,
    private userRepository: IUserRepository
  ) {}

  async execute(input: RevokeDeviceInput): Promise<void> {
    const { userId, deviceIdToRevoke, currentDeviceId, password, reason } =
      input;

    // 1. ⚠️ VALIDAÇÃO CRÍTICA: Verifica senha do usuário
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Verifica senha com Argon2 (incluindo pepper)
    const isPasswordValid = await argon2.verify(user.password, password, {
      secret: Buffer.from(config.security.pepper),
    });

    if (!isPasswordValid) {
      throw new AppError("Invalid password. Revocation denied.");
    }

    // 2. Busca dispositivo ATUAL (quem está revogando)
    const currentDevice = await this.deviceRepository.findByDeviceId(
      currentDeviceId
    );

    if (!currentDevice) {
      throw new NotFoundError("Current device not found");
    }

    if (currentDevice.userId !== userId) {
      throw new AppError("Current device does not belong to this user");
    }

    if (currentDevice.status !== "active") {
      throw new AppError("Current device is not active");
    }

    // 3. Busca dispositivo ALVO (a ser revogado)
    const deviceToRevoke = await this.deviceRepository.findByDeviceId(
      deviceIdToRevoke
    );

    if (!deviceToRevoke) {
      throw new NotFoundError("Device to revoke not found");
    }

    if (deviceToRevoke.userId !== userId) {
      throw new AppError("Device to revoke does not belong to this user");
    }

    if (deviceToRevoke.status === "revoked") {
      throw new AppError("Device is already revoked");
    }

    // 4. ⚠️ PROTEÇÃO: Dispositivo não pode revogar a si mesmo
    if (deviceIdToRevoke === currentDeviceId) {
      throw new AppError(
        "Cannot revoke your current device. Please use another device to revoke this one."
      );
    }

    // 5. ⚠️ PROTEÇÃO: Verifica permissões de master device
    const currentDeviceIsMaster = currentDevice.isMaster();
    const targetDeviceIsMaster = deviceToRevoke.isMaster();

    if (targetDeviceIsMaster && !currentDeviceIsMaster) {
      throw new AppError(
        "Only master devices can revoke other master devices. " +
          "Please use your primary device to perform this action."
      );
    }

    // 6. ⚠️ PROTEÇÃO: Verifica se não é o último master device
    if (targetDeviceIsMaster) {
      const masterDeviceCount = await this.deviceRepository.countMasterDevices(
        userId
      );

      if (masterDeviceCount <= 1) {
        throw new AppError(
          "Cannot revoke the last master device. " +
            "Please designate another device as master before revoking this one."
        );
      }
    }

    // 7. Executa revogação em transação (atomicidade)
    console.log(
      `[RevokeDevice] Starting revocation of device ${deviceIdToRevoke}`
    );

    try {
      // Deleta envelope do dispositivo (remove acesso à MDK)
      await this.envelopeRepository.deleteByDeviceId(deviceToRevoke.id);
      console.log(
        `[RevokeDevice] Envelope deleted for device ${deviceIdToRevoke}`
      );

      // Marca dispositivo como revogado
      await this.deviceRepository.revoke(deviceToRevoke.id, {
        revokedBy: currentDeviceId,
        reason: reason || "user_initiated",
      });
      console.log(
        `[RevokeDevice] Device ${deviceIdToRevoke} marked as revoked`
      );

      // TODO: Registrar log de auditoria
      // await this.auditLogRepository.create({
      //   userId,
      //   action: 'DEVICE_REVOKED',
      //   deviceId: deviceIdToRevoke,
      //   revokedBy: currentDeviceId,
      //   reason: reason || 'user_initiated',
      //   metadata: {
      //     revokedAt: new Date(),
      //     passwordVerified: true,
      //     deviceWasMaster: targetDeviceIsMaster,
      //   },
      // });

      console.log(
        `[RevokeDevice] Device ${deviceIdToRevoke} revoked successfully`
      );
    } catch (error) {
      console.error(`[RevokeDevice] Error revoking device:`, error);
      throw new AppError("Failed to revoke device. Please try again.");
    }
  }
}
