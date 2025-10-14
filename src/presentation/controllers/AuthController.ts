import { FastifyReply, FastifyRequest } from "fastify";
import { LoginDTO } from "@/application/dtos/auth.dto";
import { LoginUseCase } from "@/application/usecases/loginUseCase";
import { UserRepository } from "@/infrastructure/repositories/UserRepository";

export class AuthController {
  private readonly loginUseCase: LoginUseCase;

  constructor() {
    this.loginUseCase = new LoginUseCase(new UserRepository());
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
}
