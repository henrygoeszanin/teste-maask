import { IFileRepository } from "@/application/interfaces/IFileRepository";
import { SupabaseStorageService } from "@/infrastructure/external/SupabaseStorageService";
import { NotFoundError } from "@/domain/errors/NotFoundError";
import { AppError } from "@/domain/errors/AppError";
import { ulid } from "ulid";

export interface UpdateFileInput {
  userId: string;
  fileId: string;
  fileName: string;
  fileSize: number;
}

export interface UpdateFileOutput {
  uploadId: string;
  fileId: string;
  presignedUrl: string;
  expiresIn: number;
}

/**
 * Caso de uso para atualizar um arquivo existente
 * Gera nova URL presignada para upload do arquivo atualizado
 */
export class UpdateFileUseCase {
  constructor(
    private fileRepository: IFileRepository,
    private storageService: SupabaseStorageService
  ) {}

  async execute(input: UpdateFileInput): Promise<UpdateFileOutput> {
    const { userId, fileId, fileName, fileSize } = input;

    // Verifica se o arquivo existe e pertence ao usuário
    const existingFile = await this.fileRepository.findByFileId(fileId);

    if (!existingFile) {
      throw new NotFoundError("File not found");
    }

    if (existingFile.userId !== userId) {
      throw new AppError("Unauthorized to update this file", 403);
    }

    // Gera novo uploadId para a atualização
    const uploadId = ulid();

    // Gera caminho do arquivo no storage
    const storageKey = this.storageService.generateFileKey(userId, fileId);

    // Gera URL presignada para upload do novo conteúdo (com permissão para sobrescrever)
    const presignedUrl = await this.storageService.generatePresignedUploadUrl(
      storageKey,
      3600,
      true // allowOverwrite = true para atualização
    );

    console.log(
      `[UpdateFile] Atualização iniciada - File: ${fileId}, UploadId: ${uploadId}`
    );

    return {
      uploadId,
      fileId,
      presignedUrl,
      expiresIn: 3600,
    };
  }
}
