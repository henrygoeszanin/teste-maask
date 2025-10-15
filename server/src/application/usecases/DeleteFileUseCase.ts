import { IFileRepository } from "@/application/interfaces/IFileRepository";
import { SupabaseStorageService } from "@/infrastructure/external/SupabaseStorageService";
import { AppError } from "@/domain/errors/AppError";

export interface DeleteFileInput {
  userId: string;
  fileId: string;
}

export interface DeleteFileOutput {
  fileId: string;
  fileName: string;
  deletedAt: Date;
}

/**
 * Caso de uso para deletar um arquivo
 * Remove do storage e do banco de dados
 */
export class DeleteFileUseCase {
  constructor(
    private fileRepository: IFileRepository,
    private storageService: SupabaseStorageService
  ) {}

  async execute(input: DeleteFileInput): Promise<DeleteFileOutput> {
    const { userId, fileId } = input;

    // Verifica se o arquivo existe e pertence ao usuário
    const existingFile = await this.fileRepository.findByFileId(fileId);

    if (!existingFile) {
      throw new AppError("File not found", 404);
    }

    if (existingFile.userId !== userId) {
      throw new AppError("Unauthorized to delete this file", 403);
    }

    // Deleta do Supabase Storage
    const storageKey = existingFile.storagePath;
    try {
      await this.storageService.deleteFile(storageKey);
      console.log(`[DeleteFile] Arquivo removido do storage: ${storageKey}`);
    } catch (error) {
      console.error(
        `[DeleteFile] Erro ao remover do storage: ${error}. Continuando...`
      );
      // Continua mesmo se falhar no storage (pode já ter sido deletado)
    }

    // Deleta do banco de dados
    await this.fileRepository.delete(existingFile.id);

    console.log(`[DeleteFile] Arquivo deletado - FileId: ${fileId}`);

    return {
      fileId: existingFile.fileId,
      fileName: existingFile.fileName,
      deletedAt: new Date(),
    };
  }
}
