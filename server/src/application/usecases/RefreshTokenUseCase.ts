import { RefreshTokenDTO } from "../dtos/refresh.dto";
import { config } from "@/config";
import jwt from "jsonwebtoken";
import { IUserRepository } from "../interfaces/IUserRepository";
import { IDeviceRepository } from "../interfaces/IDeviceRepository";
import { UserRepository } from "@/infrastructure/repositories/UserRepository";
import { DeviceRepository } from "@/infrastructure/repositories/DeviceRepository";
import { AppError } from "@/domain/errors/AppError";

export class RefreshTokenUseCase {
  constructor(
    private readonly userRepo: IUserRepository = new UserRepository(),
    private readonly deviceRepo: IDeviceRepository = new DeviceRepository()
  ) {}

  async execute(data: RefreshTokenDTO, deviceId: string) {
    try {
      const decoded = jwt.verify(
        data.refreshToken,
        config.auth.jwtRefreshSecret
      ) as { sub: string };

      const user = await this.userRepo.findById(decoded.sub);
      if (!user) throw new AppError("Usuário não encontrado", 404);

      // Se deviceId foi fornecido, validar se o dispositivo está ativo
      if (deviceId) {
        const devices = await this.deviceRepo.findByUserId(user.id, "active");
        const device = devices.find((d) => d.id === deviceId);
        if (!device) {
          throw new AppError("DEVICE_REVOKED", 401);
        }
      }

      const payload = { sub: user.id, email: user.email, name: user.name };
      const expiresIn = config.auth.accessTokenExpiresIn;
      const accessToken = jwt.sign(payload, config.auth.jwtSecret, {
        expiresIn,
      });

      return {
        accessToken,
        expiresIn,
      };
    } catch (error) {
      if (error instanceof Error && error.message === "DEVICE_REVOKED") {
        throw error; // Re-throw para tratamento específico no controller
      }
      throw new Error("Refresh token inválido ou expirado");
    }
  }
}
