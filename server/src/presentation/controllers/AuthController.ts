import { FastifyReply, FastifyRequest } from "fastify";
import { LoginDTO } from "@/application/dtos/auth.dto";
import { LoginUseCase } from "@/application/usecases/loginUseCase";
import { UserRepository } from "@/infrastructure/repositories/UserRepository";
import { RefreshTokenDTO } from "@/application/dtos/refresh.dto";
import { RefreshTokenUseCase } from "@/application/usecases/RefreshTokenUseCase";
import { AppError } from "@/domain/errors/AppError";

export class AuthController {
  private readonly loginUseCase: LoginUseCase;
  private readonly refreshTokenUseCase: RefreshTokenUseCase;

  constructor() {
    this.loginUseCase = new LoginUseCase(new UserRepository());
    this.refreshTokenUseCase = new RefreshTokenUseCase();
  }

  /**
   * Realiza o login do usuário
   * @param request - Requisição Fastify contendo email e senha no body
   * @param reply - Resposta Fastify
   * @returns Retorna tokens de acesso e refresh em caso de sucesso, ou erro 401 em caso de falha
   */
  async login(request: FastifyRequest, reply: FastifyReply) {
    const { email, password } = request.body as LoginDTO;
    try {
      const result = await this.loginUseCase.execute({ email, password });
      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      } else {
        return reply
          .status(500)
          .send({ error: "unknown error", details: String(error) });
      }
    }
  }

  /**
   * Renova os tokens de acesso usando o refresh token
   * @param request - Requisição Fastify contendo refreshToken no body e x-device-name no header
   * @param reply - Resposta Fastify
   * @returns Retorna novos tokens de acesso e refresh em caso de sucesso, erro 403 para dispositivo revogado, ou erro 401 para outros casos
   */
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
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      } else {
        return reply
          .status(500)
          .send({ error: "unknown error", details: String(error) });
      }
    }
  }
}
