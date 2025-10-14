import { RegisterDTO } from "@/application/dtos/user.dto";
import { FastifyReply, FastifyRequest } from "fastify";
import { UserAlreadyExistsError } from "@/domain/errors/UserAlreadyExistsError";
import { RegisterUseCase } from "@/application/usecases/RegisterUseCase";

export class UserController {
  constructor(private readonly registerUseCase: RegisterUseCase) {}

  async create(request: FastifyRequest, reply: FastifyReply) {
    const userData = request.body as RegisterDTO;
    try {
      const response = await this.registerUseCase.execute(userData);
      return reply
        .status(201)
        .send({ message: "Usuário criado com sucesso", data: response });
    } catch (error) {
      if (error instanceof UserAlreadyExistsError) {
        return reply.status(409).send({ error: error.message });
      }
      // fallback para outros erros
      return reply.status(500).send({ error: "Erro interno do servidor" });
    }
  }
}
