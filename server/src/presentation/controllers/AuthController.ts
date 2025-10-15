import { FastifyReply, FastifyRequest } from "fastify";
import { LoginDTO } from "@/application/dtos/auth.dto";
import { LoginUseCase } from "@/application/usecases/loginUseCase";
import { UserRepository } from "@/infrastructure/repositories/UserRepository";
import { RefreshTokenDTO } from "@/application/dtos/refresh.dto";
import { RefreshTokenUseCase } from "@/application/usecases/RefreshTokenUseCase";

export class AuthController {
  private readonly loginUseCase: LoginUseCase;
  private readonly refreshTokenUseCase: RefreshTokenUseCase;

  constructor() {
    this.loginUseCase = new LoginUseCase(new UserRepository());
    this.refreshTokenUseCase = new RefreshTokenUseCase();
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    const { email, password } = request.body as LoginDTO;
    try {
      const result = await this.loginUseCase.execute({ email, password });
      return reply.status(200).send(result);
    } catch (error) {
      return reply.status(401).send({ error: "Usuário ou senha inválidos" });
    }
  }

  async refresh(request: FastifyRequest, reply: FastifyReply) {
    const { refreshToken } = request.body as RefreshTokenDTO;
    const deviceName = request.headers["x-device-name"] as string;

    try {
      const result = await this.refreshTokenUseCase.execute(
        { refreshToken },
        deviceName
      );
      return reply.status(200).send(result);
    } catch (error) {
      const err = error as Error;

      // Tratamento específico para dispositivo revogado
      if (err.message === "DEVICE_REVOKED") {
        return reply.status(403).send({
          error: "DEVICE_REVOKED",
          message: "Este dispositivo foi revogado. Faça login novamente.",
        });
      }

      return reply.status(401).send({ error: err.message });
    }
  }
}
