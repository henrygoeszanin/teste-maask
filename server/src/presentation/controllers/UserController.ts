import { RegisterDTO, UpdateUserDTO } from "@/application/dtos/user.dto";
import { FastifyReply, FastifyRequest } from "fastify";
import { UserAlreadyExistsError } from "@/domain/errors/UserAlreadyExistsError";
import { RegisterUseCase } from "@/application/usecases/RegisterUseCase";
import { UpdateUserUseCase } from "@/application/usecases/UpdateUserUseCase";
import { NotFoundError } from "@/domain/errors/NotFoundError";
import crypto from "crypto";

export class UserController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase
  ) {}

  async create(request: FastifyRequest, reply: FastifyReply) {
    const userData = request.body as RegisterDTO;
    try {
      const newCryptografyCode = crypto.randomBytes(64).toString("hex"); // Gera um código de criptografia aleatório

      const response = await this.registerUseCase.execute(
        userData,
        newCryptografyCode
      );
      const data = {
        ...response,
        createdAt:
          response.createdAt instanceof Date
            ? response.createdAt.toISOString()
            : response.createdAt,
        updatedAt:
          response.updatedAt instanceof Date
            ? response.updatedAt.toISOString()
            : response.updatedAt,
      };
      return reply.status(201).send({
        message: "Usuário criado com sucesso",
        criptografyCode: newCryptografyCode, // Inclui o código de criptografia no nível raiz
        data,
      });
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
      // Garante que datas sejam string ISO
      const data = {
        ...updatedUser,
        createdAt:
          updatedUser.createdAt instanceof Date
            ? updatedUser.createdAt.toISOString()
            : updatedUser.createdAt,
        updatedAt:
          updatedUser.updatedAt instanceof Date
            ? updatedUser.updatedAt.toISOString()
            : updatedUser.updatedAt,
      };
      return reply.status(200).send({
        message: "Usuário atualizado com sucesso",
        data,
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

  async me(request: FastifyRequest, reply: FastifyReply) {
    // O middleware de autenticação garante que request.user existe
    const user = request.user;
    return reply.status(200).send({
      data: user,
    });
  }
}
