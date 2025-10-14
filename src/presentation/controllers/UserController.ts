import { RegisterDTO, UpdateUserDTO } from "@/application/dtos/user.dto";
import { FastifyReply, FastifyRequest } from "fastify";
import { UserAlreadyExistsError } from "@/domain/errors/UserAlreadyExistsError";
import { RegisterUseCase } from "@/application/usecases/RegisterUseCase";
import { UpdateUserUseCase } from "@/application/usecases/UpdateUserUseCase";
import { NotFoundError } from "@/domain/errors/NotFoundError";

export class UserController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase
  ) {}

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

  async updateMe(request: FastifyRequest, reply: FastifyReply) {
    const updateData = request.body as UpdateUserDTO;
    const userId = request.user!.id; // O middleware de autenticação garante que user existe

    try {
      const updatedUser = await this.updateUserUseCase.execute(
        userId,
        updateData
      );
      return reply.status(200).send({
        message: "Usuário atualizado com sucesso",
        data: updatedUser,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof UserAlreadyExistsError) {
        return reply.status(409).send({ error: error.message });
      }
      return reply.status(500).send({ error: "Erro interno do servidor" });
    }
  }
}
