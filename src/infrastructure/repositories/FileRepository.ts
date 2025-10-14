import { eq, desc, count } from "drizzle-orm";
import { db } from "@/infrastructure/databases/connection";
import { files } from "@/infrastructure/databases/schema";
import { File, EncryptionMetadata } from "@/domain/entities/Files";
import { IFileRepository } from "@/application/interfaces/IFileRepository";

export class FileRepository implements IFileRepository {
  async create(file: File): Promise<File> {
    const [created] = await db
      .insert(files)
      .values({
        id: file.id,
        userId: file.userId,
        fileId: file.fileId,
        fileName: file.fileName,
        sizeBytes: file.sizeBytes,
        storagePath: file.storagePath,
        encryptedFek: file.encryptedFek,
        encryptionMetadata: file.encryptionMetadata,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      })
      .returning();

    return this.mapToEntity(created);
  }

  async findById(id: string): Promise<File | null> {
    const [file] = await db
      .select()
      .from(files)
      .where(eq(files.id, id))
      .limit(1);

    return file ? this.mapToEntity(file) : null;
  }

  async findByFileId(fileId: string): Promise<File | null> {
    const [file] = await db
      .select()
      .from(files)
      .where(eq(files.fileId, fileId))
      .limit(1);

    return file ? this.mapToEntity(file) : null;
  }

  async findByUserId(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ files: File[]; total: number }> {
    const offset = (page - 1) * limit;

    // Query para pegar os arquivos com paginação
    const fileResults = await db
      .select()
      .from(files)
      .where(eq(files.userId, userId))
      .orderBy(desc(files.createdAt))
      .limit(limit)
      .offset(offset);

    // Query para pegar o total de arquivos
    const [totalResult] = await db
      .select({ count: count() })
      .from(files)
      .where(eq(files.userId, userId));

    return {
      files: fileResults.map(this.mapToEntity),
      total: totalResult.count,
    };
  }

  async update(file: File): Promise<File> {
    const [updated] = await db
      .update(files)
      .set({
        fileName: file.fileName,
        sizeBytes: file.sizeBytes,
        storagePath: file.storagePath,
        encryptedFek: file.encryptedFek,
        encryptionMetadata: file.encryptionMetadata,
        updatedAt: file.updatedAt,
      })
      .where(eq(files.id, file.id))
      .returning();

    return this.mapToEntity(updated);
  }

  async delete(id: string): Promise<void> {
    await db.delete(files).where(eq(files.id, id));
  }

  private mapToEntity(row: typeof files.$inferSelect): File {
    return new File(
      row.id,
      row.userId,
      row.fileId,
      row.fileName,
      row.sizeBytes,
      row.storagePath,
      row.encryptedFek,
      row.encryptionMetadata as EncryptionMetadata,
      row.createdAt,
      row.updatedAt
    );
  }
}
