import { IFileRepository } from "@/application/interfaces/IFileRepository";
import { SupabaseStorageService } from "@/infrastructure/external/SupabaseStorageService";
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
    const { userId, fileId } = input;

    // Verifica se o arquivo existe e pertence ao usuário
    const existingFile = await this.fileRepository.findByFileId(fileId);

    if (!existingFile) {
      throw new AppError("File not found", 404);
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
      true // allowOverwrite = true para atualização
    );

    return {
      uploadId,
      fileId,
      presignedUrl,
      expiresIn: 3600,
    };
  }
}
