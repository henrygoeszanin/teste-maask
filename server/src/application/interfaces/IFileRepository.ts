import { File } from "@/domain/entities/Files";

export interface IFileRepository {
  create(file: File): Promise<File>;
  findById(id: string): Promise<File | null>;
  findByFileId(fileId: string): Promise<File | null>;
  findByUserId(
    userId: string,
    page: number,
    limit: number
  ): Promise<{ files: File[]; total: number }>;
  update(file: File): Promise<File>;
  delete(id: string): Promise<void>;
}
