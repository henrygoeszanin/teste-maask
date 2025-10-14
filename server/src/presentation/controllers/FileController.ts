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
   * Salva metadados no banco após upload ao S3
   */
  static async completeUpload(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.id!;
    const { uploadId, encryptedFek, encryptionMetadata } =
      request.body as CompleteUploadDTO;

    // Nota: precisamos extrair fileId e fileName do uploadId ou de outro lugar
    // Por enquanto, vamos assumir que o cliente envia esses dados
    // Idealmente, deveríamos armazenar o uploadId em cache (Redis) com os metadados

    const fileRepository = new FileRepository();
    const storageService = new SupabaseStorageService();
    const completeUploadUseCase = new CompleteUploadUseCase(
      fileRepository,
      storageService
    );

    // TODO: Implementar cache para armazenar metadados temporários do upload
    // Por enquanto, retornaremos erro informando que precisa implementar cache
    return reply.status(501).send({
      error: "Upload completion requires cache implementation",
      message:
        "Need to implement Redis cache to store temporary upload metadata",
    });

    // Código que será usado quando implementarmos o cache:
    /*
    const result = await completeUploadUseCase.execute({
      userId,
      uploadId,
      fileId, // do cache
      fileName, // do cache
      fileSize, // do cache
      encryptedFek,
      encryptionMetadata,
    });

    return reply.status(200).send(result);
    */
  }

  /**
   * Inicia o download de um arquivo
   * Retorna presigned URL para download direto do S3
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
      data: result,
    });
  }
}
