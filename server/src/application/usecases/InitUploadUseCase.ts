import { ulid } from "ulid";
import { randomUUID } from "crypto";
import { S3Service } from "@/infrastructure/external/S3Service";

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
  constructor(private s3Service: S3Service) {}

  async execute(input: InitUploadInput): Promise<InitUploadOutput> {
    // Gera IDs únicos
    const uploadId = ulid(); // ID interno para rastrear o upload
    const fileId = randomUUID(); // ID do arquivo (UUID)

    // Gera o caminho no S3
    const storageKey = this.s3Service.generateFileKey(input.userId, fileId);

    // Gera presigned URL para upload (válida por 1 hora)
    // Não passamos mimeType para evitar preflight CORS
    const expiresIn = 3600; // 1 hora
    const presignedUrl = await this.s3Service.generatePresignedUploadUrl(
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
