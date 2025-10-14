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
    try {
      const result = await this.refreshTokenUseCase.execute({ refreshToken });
      return reply.status(200).send(result);
    } catch (error) {
      return reply.status(401).send({ error: (error as Error).message });
    }
  }
}
