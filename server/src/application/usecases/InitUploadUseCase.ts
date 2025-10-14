import { ulid } from "ulid";
import { randomUUID } from "crypto";
import { SupabaseStorageService } from "@/infrastructure/external/SupabaseStorageService";

export interface InitUploadInput {
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType?: string;
}

export interface InitUploadOutput {
  uploadId: string;
  fileId: string;
  presignedUrl: string;
  expiresIn: number;
}

export class InitUploadUseCase {
  constructor(private storageService: SupabaseStorageService) {}

  async execute(input: InitUploadInput): Promise<InitUploadOutput> {
    // Gera IDs únicos
    const uploadId = ulid(); // ID interno para rastrear o upload
    const fileId = randomUUID(); // ID do arquivo (UUID)

    // Gera o caminho no Storage
    const storageKey = this.storageService.generateFileKey(
      input.userId,
      fileId
    );

    // Gera presigned URL para upload (válida por 1 hora)
    const expiresIn = 3600; // 1 hora
    const presignedUrl = await this.storageService.generatePresignedUploadUrl(
      storageKey,
      expiresIn
    );

    return {
      uploadId,
      fileId,
      presignedUrl,
      expiresIn,
    };
  }
}
