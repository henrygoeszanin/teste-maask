import { IFileRepository } from "@/application/interfaces/IFileRepository";
import { SupabaseStorageService } from "@/infrastructure/external/SupabaseStorageService";
import { NotFoundError } from "@/domain/errors/NotFoundError";
import { AppError } from "@/domain/errors/AppError";

export interface DownloadFileInput {
  userId: string;
  fileId: string;
}

export interface DownloadFileOutput {
  fileId: string;
  fileName: string;
  presignedUrl: string;
  encryptedFek: string;
  encryptionMetadata: {
    algorithm: string;
    iv: string;
    authTag: string;
  };
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
      throw new NotFoundError("Arquivo não encontrado");
    }

    // Verifica se o arquivo pertence ao usuário
    if (file.userId !== input.userId) {
      throw new AppError(
        "Você não tem permissão para acessar este arquivo",
        403
      );
    }

    // Verifica se o arquivo existe no Storage
    const fileExists = await this.storageService.fileExists(file.storagePath);

    if (!fileExists) {
      throw new NotFoundError(
        "Arquivo não encontrado no storage. Pode ter sido deletado."
      );
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
      encryptedFek: file.encryptedFek,
      encryptionMetadata: file.encryptionMetadata,
      expiresIn,
    };
  }
}
