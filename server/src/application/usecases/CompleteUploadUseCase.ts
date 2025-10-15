import { File } from "@/domain/entities/Files";
import { IFileRepository } from "@/application/interfaces/IFileRepository";
import { SupabaseStorageService } from "@/infrastructure/external/SupabaseStorageService";
import { AppError } from "@/domain/errors/AppError";

export interface CompleteUploadInput {
  userId: string;
  uploadId: string;
  fileId: string;
  fileName: string;
  fileSize: number;
}

export interface CompleteUploadOutput {
  fileId: string;
  fileName: string;
  sizeBytes: number;
  uploadedAt: Date;
}

export class CompleteUploadUseCase {
  constructor(
    private fileRepository: IFileRepository,
    private storageService: SupabaseStorageService
  ) {}

  async execute(input: CompleteUploadInput): Promise<CompleteUploadOutput> {
    // Gera o caminho no Storage (mesmo padrão usado no InitUpload)
    const storagePath = this.storageService.generateFileKey(
      input.userId,
      input.fileId
    );

    // Verifica se o arquivo realmente existe no Storage
    const fileExists = await this.storageService.fileExists(storagePath);

    if (!fileExists) {
      throw new AppError(
        "Arquivo não encontrado no storage. O upload pode ter falhado ou expirado.",
        404
      );
    }

    // Verifica se já existe um registro com este fileId
    const existingFile = await this.fileRepository.findByFileId(input.fileId);

    if (existingFile) {
      // Caso de ATUALIZAÇÃO - atualiza registro existente
      console.log(`[CompleteUpload] Atualizando arquivo existente: ${input.fileId}`);
      
      existingFile.fileName = input.fileName;
      existingFile.sizeBytes = input.fileSize;
      existingFile.updatedAt = new Date();

      const updatedFile = await this.fileRepository.update(existingFile);

      return {
        fileId: updatedFile.fileId,
        fileName: updatedFile.fileName,
        sizeBytes: updatedFile.sizeBytes,
        uploadedAt: updatedFile.updatedAt,
      };
    }

    // Caso de NOVO UPLOAD - cria novo registro
    console.log(`[CompleteUpload] Criando novo arquivo: ${input.fileId}`);
    
    const file = File.create(
      input.userId,
      input.fileName,
      input.fileSize,
      storagePath
    );

    // Sobrescreve o fileId gerado pelo create com o fornecido
    file.fileId = input.fileId;

    // Salva no banco de dados
    const savedFile = await this.fileRepository.create(file);

    return {
      fileId: savedFile.fileId,
      fileName: savedFile.fileName,
      sizeBytes: savedFile.sizeBytes,
      uploadedAt: savedFile.createdAt,
    };
  }
}
