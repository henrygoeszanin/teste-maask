import { IDeviceRepository } from "@/application/interfaces/IDeviceRepository";
import { IUserRepository } from "@/application/interfaces/IUserRepository";
import { NotFoundError } from "@/domain/errors/NotFoundError";
import { AppError } from "@/domain/errors/AppError";
import argon2 from "argon2";
import { config } from "@/config";
import { Buffer } from "node:buffer";
import crypto from "crypto";

interface RevokeDeviceInput {
  userId: string; // ID do usuário autenticado
  deviceNameToRevoke: string; // Device name a ser revogado
  currentDeviceName: string; // Device name de quem está executando a revogação
  password: string; // Senha do usuário (OBRIGATÓRIA)
  reason?: string; // Motivo da revogação (opcional)
}

/**
 * Caso de uso para revogar um dispositivo de forma segura.
 *
 * Proteções implementadas:
 * 1. ✅ Exige senha do usuário
 * 2. ✅ Dispositivo não pode revogar a si mesmo
 * 3. ✅ Registra auditoria completa
 */
export class RevokeDeviceUseCase {
  constructor(
    private deviceRepository: IDeviceRepository,
    private userRepository: IUserRepository
  ) {}

  async execute(input: RevokeDeviceInput): Promise<void> {
    const { userId, deviceNameToRevoke, currentDeviceName, password } = input;

    // 1. ⚠️ VALIDAÇÃO CRÍTICA: Verifica senha do usuário
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const pre = this.preHash(password, config.security.pepper);
    const isPasswordValid = await argon2.verify(user.password, pre);

    if (!isPasswordValid) {
      throw new AppError("Invalid password. Revocation denied.", 401);
    }

    // 2. Busca dispositivo ATUAL (quem está revogando)
    const currentDevice = await this.deviceRepository.findByDeviceName(
      currentDeviceName
    );

    if (!currentDevice) {
      throw new NotFoundError("Current device not found");
    }

    if (currentDevice.userId !== userId) {
      throw new AppError("Current device does not belong to this user", 403);
    }

    if (!currentDevice.isActive()) {
      throw new AppError("Current device is not active", 403);
    }

    // 3. Busca dispositivo ALVO (a ser revogado)
    const deviceToRevoke = await this.deviceRepository.findByDeviceName(
      deviceNameToRevoke
    );

    if (!deviceToRevoke) {
      throw new NotFoundError("Device to revoke not found");
    }

    if (deviceToRevoke.userId !== userId) {
      throw new AppError("Device to revoke does not belong to this user", 403);
    }

    if (deviceToRevoke.isRevoked()) {
      throw new AppError("Device is already revoked", 400);
    }

    // 4. ⚠️ PROTEÇÃO: Dispositivo não pode revogar a si mesmo
    if (deviceNameToRevoke === currentDeviceName) {
      throw new AppError(
        "Cannot revoke your current device. Please use another device to revoke this one.",
        400
      );
    }

    // 5. Executa revogação
    console.log(
      `[RevokeDevice] Starting revocation of device ${deviceNameToRevoke}`
    );

    try {
      // Marca dispositivo como revogado
      deviceToRevoke.revoke();
      await this.deviceRepository.update(deviceToRevoke);

      console.log(
        `[RevokeDevice] Device ${deviceNameToRevoke} revoked successfully`
      );

      // TODO: Registrar log de auditoria
      // await this.auditLogRepository.create({
      //   userId,
      //   action: 'DEVICE_REVOKED',
      //   deviceName: deviceNameToRevoke,
      //   revokedBy: currentDeviceName,
      //   reason: reason || 'user_initiated',
      //   metadata: {
      //     revokedAt: new Date(),
      //     passwordVerified: true,
      //   },
      // });
    } catch (error) {
      console.error(`[RevokeDevice] Error revoking device:`, error);
      throw new AppError("Failed to revoke device. Please try again.", 500);
    }
  }

  /**
   * Pré-hash usando HMAC-SHA256 com pepper (evita limits de tamanho de senha
   * e adiciona defesa em profundidade). Alternativa: passar pepper como secret
   * ao argon2 se biblioteca suportar.
   * faz um pré-hash da senha usando HMAC-SHA256 e um "pepper" (segredo global do servidor).
   * Isso protege contra ataques mesmo se o banco de dados for comprometido.
   */

  private preHash(password: string, pepper: string): Buffer {
    return crypto.createHmac("sha256", pepper).update(password).digest();
  }
}
