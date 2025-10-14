import { RefreshTokenDTO } from "../dtos/refresh.dto";
import { config } from "@/config";
import jwt from "jsonwebtoken";
import { IUserRepository } from "../interfaces/IUserRepository";
import { UserRepository } from "@/infrastructure/repositories/UserRepository";

export class RefreshTokenUseCase {
  constructor(
    private readonly userRepo: IUserRepository = new UserRepository()
  ) {}

  async execute(data: RefreshTokenDTO) {
    try {
      const decoded = jwt.verify(
        data.refreshToken,
        config.auth.jwtRefreshSecret
      ) as { sub: string };
      const user = await this.userRepo.findById(decoded.sub);
      if (!user) throw new Error("Usuário não encontrado");
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
      throw new Error("Refresh token inválido ou expirado");
    }
  }
}
