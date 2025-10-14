import { FastifyReply, FastifyRequest } from "fastify";
import { InitUploadUseCase } from "@/application/usecases/InitUploadUseCase";
import { CompleteUploadUseCase } from "@/application/usecases/CompleteUploadUseCase";
import { DownloadFileUseCase } from "@/application/usecases/DownloadFileUseCase";
import { ListFilesUseCase } from "@/application/usecases/ListFilesUseCase";
import { FileRepository } from "@/infrastructure/repositories/FileRepository";
import { SupabaseStorageService } from "@/infrastructure/external/SupabaseStorageService";
import {
  InitUploadDTO,
  CompleteUploadDTO,
  ListFilesQueryDTO,
} from "@/application/dtos/file.dto";

export class FileController {
  /**
   * Inicia um upload de arquivo
   * Retorna presigned URL para upload direto ao Supabase Storage
   */
  static async initUpload(request: FastifyRequest, reply: FastifyReply) {
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
   */
  static async completeUpload(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.id!;
    const {
      uploadId,
      fileId,
      fileName,
      fileSize,
      encryptedFek,
      fekEncryptionMetadata,
      fileEncryptionMetadata,
    } = request.body as CompleteUploadDTO;

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
      encryptedFek,
      fekEncryptionMetadata,
      fileEncryptionMetadata,
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
  }

  /**
   * Inicia o download de um arquivo
   * Retorna presigned URL para download direto do Supabase Storage
   */
  static async download(request: FastifyRequest, reply: FastifyReply) {
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
  }

  /**
   * Lista todos os arquivos do usuário autenticado
   */
  static async list(request: FastifyRequest, reply: FastifyReply) {
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
  }
}
