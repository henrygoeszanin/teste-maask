import { IFileRepository } from "@/application/interfaces/IFileRepository";

export interface ListFilesInput {
  userId: string;
  page: number;
  limit: number;
}

export interface FileMetadata {
  fileId: string;
  fileName: string;
  sizeBytes: number;
  createdAt: Date;
}

export interface ListFilesOutput {
  files: FileMetadata[];
  total: number;
  page: number;
  limit: number;
}

export class ListFilesUseCase {
  constructor(private fileRepository: IFileRepository) {}

  async execute(input: ListFilesInput): Promise<ListFilesOutput> {
    const { files, total } = await this.fileRepository.findByUserId(
      input.userId,
      input.page,
      input.limit
    );

    const fileMetadata: FileMetadata[] = files.map((file) => ({
      fileId: file.fileId,
      fileName: file.fileName,
      sizeBytes: file.sizeBytes,
      createdAt: file.createdAt,
    }));

    return {
      files: fileMetadata,
      total,
      page: input.page,
      limit: input.limit,
    };
  }
}
