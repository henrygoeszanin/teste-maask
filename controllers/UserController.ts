import { RegisterDTO, UpdateUserDTO } from "@/application/dtos/user.dto";
import { FastifyReply, FastifyRequest } from "fastify";
import { RegisterUseCase } from "@/application/usecases/RegisterUseCase";
import { UpdateUserUseCase } from "@/application/usecases/UpdateUserUseCase";
import crypto from "crypto";
import { AppError } from "@/domain/errors/AppError";

export class UserController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase
  ) {}

  /**
   * Cria um novo usuário no sistema
   * @param request - Requisição Fastify contendo dados do usuário (name, email, password)
   * @param reply - Resposta Fastify
   * @returns Retorna dados do usuário criado com código de criptografia, ou erro 409 se email já existe
   */
  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userData = request.body as RegisterDTO;
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
   * Atualiza os dados do usuário autenticado
   * @param request - Requisição Fastify contendo dados para atualização (name, email)
   * @param reply - Resposta Fastify
   * @returns Retorna dados do usuário atualizado, ou erro 404 se usuário não encontrado, erro 409 se email já existe
   */
  async updateMe(request: FastifyRequest, reply: FastifyReply) {
    try {
      const updateData = request.body as UpdateUserDTO;
      const userId = request.user!.id; // O middleware de autenticação garante que user existe

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
   * Retorna os dados do usuário autenticado
   * @param request - Requisição Fastify (usuário obtido do middleware de autenticação)
   * @param reply - Resposta Fastify
   * @returns Retorna dados do usuário atual
   */
  async me(request: FastifyRequest, reply: FastifyReply) {
    try {
      // O middleware de autenticação garante que request.user existe
      const user = request.user;
      return reply.status(200).send({
        data: user,
      });
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
