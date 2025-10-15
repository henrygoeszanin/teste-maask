import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "@config/index";
import { AppError } from "@/domain/errors/AppError";

export class SupabaseStorageService {
  private client: SupabaseClient;
  private bucket: string;

  constructor() {
    // Use service role key para operações no backend (bypass RLS)
    const serviceKey =
      config.supabase.serviceRoleKey || config.supabase.anonKey;

    this.client = createClient(config.supabase.url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    this.bucket = config.supabase.storageBucket;
  }

  /**
   * Faz upload de um arquivo para o Supabase Storage
   * @param path - Caminho do arquivo no bucket (ex: users/123/files/abc.txt)
   * @param file - Conteúdo do arquivo (Buffer ou ArrayBuffer)
   * @param contentType - Tipo MIME do arquivo
   */
  async uploadFile(
    path: string,
    file: Buffer | ArrayBuffer,
    contentType?: string
  ): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(path, file, {
        contentType: contentType || "application/octet-stream",
        upsert: false, // Não sobrescreve se já existir
      });

    if (error) {
      throw new AppError(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Faz download de um arquivo do Supabase Storage
   * @param path - Caminho do arquivo no bucket
   * @returns Buffer do arquivo
   */
  async downloadFile(path: string): Promise<Buffer> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .download(path);

    if (error) {
      throw new AppError(`Failed to download file: ${error.message}`);
    }

    if (!data) {
      throw new AppError("File not found or empty");
    }

    // Converte Blob para Buffer
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Deleta um arquivo do Supabase Storage
   * @param path - Caminho do arquivo no bucket
   */
  async deleteFile(path: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .remove([path]);

    if (error) {
      throw new AppError(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Verifica se um arquivo existe no Supabase Storage
   * @param path - Caminho do arquivo no bucket
   * @returns true se o arquivo existe, false caso contrário
   */
  async fileExists(path: string): Promise<boolean> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .list(this.getDirectoryPath(path), {
        search: this.getFileName(path),
      });

    if (error) {
      return false;
    }

    return data.length > 0;
  }

  /**
   * Obtém metadados de um arquivo
   * @param path - Caminho do arquivo no bucket
   * @returns Metadados do arquivo
   * *Os metadados sao salvos no upload no banco de dados para facilitar o acesso
   */
  // async getFileMetadata(path: string): Promise<{
  //   size?: number;
  //   lastModified?: Date;
  //   contentType?: string;
  // }> {
  //   const { data, error } = await this.client.storage
  //     .from(this.bucket)
  //     .list(this.getDirectoryPath(path), {
  //       search: this.getFileName(path),
  //     });

  //   if (error || !data || data.length === 0) {
  //     throw new AppError("File not found");
  //   }

  //   const fileInfo = data[0];
  //   return {
  //     size: fileInfo.metadata?.size,
  //     lastModified: fileInfo.updated_at
  //       ? new Date(fileInfo.updated_at)
  //       : undefined,
  //     contentType: fileInfo.metadata?.mimetype,
  //   };
  // }

  /**
   * Gera uma URL assinada para upload direto ao Supabase Storage
   * @param path - Caminho do arquivo no bucket
   * @param allowOverwrite - Se true, permite sobrescrever arquivo existente
   * @returns URL assinada para upload
   */
  async generatePresignedUploadUrl(
    path: string,
    allowOverwrite: boolean = false
  ): Promise<string> {
    // Se permitir sobrescrita e arquivo existe, deleta primeiro
    if (allowOverwrite) {
      const exists = await this.fileExists(path);
      if (exists) {
        console.info(
          `[Supabase] Deletando arquivo existente antes do upload: ${path}`
        );
        try {
          await this.deleteFile(path);
        } catch (error) {
          console.warn(
            `[Supabase] Erro ao deletar arquivo existente: ${error}`
          );
          // Continua mesmo se falhar ao deletar
        }
      }
    }

    // Usa createSignedUploadUrl do Supabase para upload direto do cliente
    // Similar às presigned URLs do S3, mas gerenciado pelo Supabase
    // O Supabase Storage cria URLs com expiração automática
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUploadUrl(path, {
        upsert: allowOverwrite,
      });

    if (error || !data) {
      throw new AppError(
        `Failed to create signed upload URL: ${
          error?.message || "Unknown error"
        }`
      );
    }

    // Nota: O Supabase Storage cria URLs de upload com expiração fixa de 2 horas
    // O parâmetro expiresIn é mantido na assinatura para compatibilidade futura
    return data.signedUrl;
  }

  /**
   * Gera uma URL assinada para download direto do Supabase Storage
   * @param path - Caminho do arquivo no bucket
   * @param expiresIn - Tempo de expiração em segundos (padrão: 3600 = 1 hora)
   * @returns URL assinada para download
   */
  async generatePresignedDownloadUrl(
    path: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(path, expiresIn);

    if (error || !data) {
      throw new AppError(
        `Failed to create signed URL: ${error?.message || "Unknown error"}`
      );
    }

    return data.signedUrl;
  }

  /**
   * Gera o caminho (path) para um arquivo no Storage
   * @param userId - ID do usuário
   * @param fileId - ID único do arquivo
   * @returns Caminho completo no formato: users/{userId}/files/{fileId}
   */
  generateFileKey(userId: string, fileId: string): string {
    return `users/${userId}/files/${fileId}`;
  }

  /**
   * Extrai o diretório de um caminho completo
   * @param path - Caminho completo (ex: users/123/files/abc.txt)
   * @returns Diretório (ex: users/123/files)
   */
  private getDirectoryPath(path: string): string {
    const parts = path.split("/");
    parts.pop(); // Remove o nome do arquivo
    return parts.join("/") || "";
  }

  /**
   * Extrai o nome do arquivo de um caminho completo
   * @param path - Caminho completo (ex: users/123/files/abc.txt)
   * @returns Nome do arquivo (ex: abc.txt)
   */
  private getFileName(path: string): string {
    const parts = path.split("/");
    return parts[parts.length - 1] || "";
  }
}
