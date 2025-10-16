import { IFileRepository } from "@/application/interfaces/IFileRepository";
import { SupabaseStorageService } from "@/infrastructure/external/SupabaseStorageService";
import { AppError } from "@/domain/errors/AppError";

export interface DownloadFileInput {
  userId: string;
  fileId: string;
}

export interface DownloadFileOutput {
  fileId: string;
  fileName: string;
  presignedUrl: string;
  expiresIn: number;
}

export class DownloadFileUseCase {
  constructor(
    private fileRepository: IFileRepository,
    private storageService: SupabaseStorageService
  ) {}

  async execute(input: DownloadFileInput): Promise<DownloadFileOutput> {
    // Busca o arquivo no banco de dados
    const file = await this.fileRepository.findByFileId(input.fileId);

    if (!file) {
      throw new AppError("File not found", 404);
    }

    // Verifica se o arquivo pertence ao usuário
    if (file.userId !== input.userId) {
      throw new AppError("You do not have permission to access this file", 403);
    }

    // Verifica se o arquivo existe no Storage
    const fileExists = await this.storageService.fileExists(file.storagePath);

    if (!fileExists) {
      throw new AppError("File not found in storage", 404);
    }

    // Gera presigned URL para download (válida por 1 hora)
    const expiresIn = 3600; // 1 hora
    const presignedUrl = await this.storageService.generatePresignedDownloadUrl(
      file.storagePath,
      expiresIn
    );

    return {
      fileId: file.fileId,
      fileName: file.fileName,
      presignedUrl,
      expiresIn,
    };
  }
}
