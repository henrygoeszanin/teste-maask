import { FastifyReply, FastifyRequest } from "fastify";
import { InitUploadUseCase } from "@/application/usecases/InitUploadUseCase";
import { CompleteUploadUseCase } from "@/application/usecases/CompleteUploadUseCase";
import { DownloadFileUseCase } from "@/application/usecases/DownloadFileUseCase";
import { ListFilesUseCase } from "@/application/usecases/ListFilesUseCase";
import { UpdateFileUseCase } from "@/application/usecases/UpdateFileUseCase";
import { DeleteFileUseCase } from "@/application/usecases/DeleteFileUseCase";
import { FileRepository } from "@/infrastructure/repositories/FileRepository";
import { SupabaseStorageService } from "@/infrastructure/external/SupabaseStorageService";
import {
  InitUploadDTO,
  CompleteUploadDTO,
  ListFilesQueryDTO,
  UpdateFileDTO,
} from "@/application/dtos/file.dto";
import { AppError } from "@/domain/errors/AppError";

export class FileController {
  /**
   * Inicia um upload de arquivo
   * Retorna presigned URL para upload direto ao Supabase Storage
   * @param request - Requisição Fastify contendo fileName, fileSize e mimeType no body
   * @param reply - Resposta Fastify
   * @returns Retorna dados para upload incluindo presigned URL
   */
  static async initUpload(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.user?.id!;
      const { fileName, fileSize, mimeType } = request.body as InitUploadDTO;

      const storageService = new SupabaseStorageService();
      const initUploadUseCase = new InitUploadUseCase(storageService);

      const result = await initUploadUseCase.execute({
        userId,
        fileName,
        fileSize,
        mimeType,
      });

      return reply.status(200).send({
        data: result,
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
   * Completa o upload de um arquivo
   * Salva metadados no banco após upload ao Supabase Storage
   *
   * Nota: O front-end já possui todas as informações necessárias:
   * - fileId: recebido do initUpload
   * - fileName: nome original do arquivo selecionado pelo usuário
   * - fileSize: tamanho do arquivo (file.size)
   * Não é necessário cache (Redis) para armazenar essas informações.
   * @param request - Requisição Fastify contendo uploadId, fileId, fileName e fileSize no body
   * @param reply - Resposta Fastify
   * @returns Retorna confirmação de upload completado com metadados do arquivo
   */
  static async completeUpload(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.user?.id!;
      const { uploadId, fileId, fileName, fileSize } =
        request.body as CompleteUploadDTO;

      const fileRepository = new FileRepository();
      const storageService = new SupabaseStorageService();
      const completeUploadUseCase = new CompleteUploadUseCase(
        fileRepository,
        storageService
      );

      const result = await completeUploadUseCase.execute({
        userId,
        uploadId,
        fileId,
        fileName,
        fileSize,
      });

      return reply.status(200).send({
        message: "Upload completado com sucesso",
        data: {
          fileId: result.fileId,
          fileName: result.fileName,
          sizeBytes: result.sizeBytes,
          uploadedAt: result.uploadedAt.toISOString(),
        },
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
   * Inicia o download de um arquivo
   * Retorna presigned URL para download direto do Supabase Storage
   * @param request - Requisição Fastify contendo fileId nos params
   * @param reply - Resposta Fastify
   * @returns Retorna presigned URL para download
   */
  static async download(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.user?.id!;
      const { fileId } = request.params as { fileId: string };

      const fileRepository = new FileRepository();
      const storageService = new SupabaseStorageService();
      const downloadFileUseCase = new DownloadFileUseCase(
        fileRepository,
        storageService
      );

      const result = await downloadFileUseCase.execute({
        userId,
        fileId,
      });

      return reply.send({
        data: result,
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
   * Lista todos os arquivos do usuário autenticado
   * @param request - Requisição Fastify com query params page e limit opcionais
   * @param reply - Resposta Fastify
   * @returns Retorna lista paginada de arquivos do usuário
   */
  static async list(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.user?.id!;
      const { page = 1, limit = 20 } = request.query as ListFilesQueryDTO;

      const fileRepository = new FileRepository();
      const listFilesUseCase = new ListFilesUseCase(fileRepository);

      const result = await listFilesUseCase.execute({
        userId,
        page,
        limit,
      });

      return reply.send({
        data: {
          files: result.files.map((file) => ({
            fileId: file.fileId,
            fileName: file.fileName,
            sizeBytes: file.sizeBytes,
            createdAt: file.createdAt.toISOString(),
          })),
          total: result.total,
          page: result.page,
          limit: result.limit,
        },
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
   * Atualiza um arquivo existente
   * Retorna presigned URL para upload do novo conteúdo
   * @param request - Requisição Fastify contendo fileId nos params e fileName, fileSize no body
   * @param reply - Resposta Fastify
   * @returns Retorna presigned URL para upload da versão atualizada
   */
  static async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.user?.id!;
      const { fileId } = request.params as { fileId: string };
      const { fileName, fileSize } = request.body as UpdateFileDTO;

      const fileRepository = new FileRepository();
      const storageService = new SupabaseStorageService();
      const updateFileUseCase = new UpdateFileUseCase(
        fileRepository,
        storageService
      );

      const result = await updateFileUseCase.execute({
        userId,
        fileId,
        fileName,
        fileSize,
      });

      return reply.status(200).send({
        data: result,
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
   * Deleta um arquivo do usuário
   * Remove do storage e do banco de dados
   * @param request - Requisição Fastify contendo fileId nos params
   * @param reply - Resposta Fastify
   * @returns Retorna confirmação de deleção com dados do arquivo removido
   */
  static async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.user?.id!;
      const { fileId } = request.params as { fileId: string };

      const fileRepository = new FileRepository();
      const storageService = new SupabaseStorageService();
      const deleteFileUseCase = new DeleteFileUseCase(
        fileRepository,
        storageService
      );

      const result = await deleteFileUseCase.execute({
        userId,
        fileId,
      });

      return reply.status(200).send({
        message: "Arquivo deletado com sucesso",
        data: {
          fileId: result.fileId,
          fileName: result.fileName,
          deletedAt: result.deletedAt.toISOString(),
        },
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
