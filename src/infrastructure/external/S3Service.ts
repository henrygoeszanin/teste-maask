import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { config } from "@config/index";
import { Readable } from "stream";

export class S3Service {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.client = new S3Client({
      region: config.s3.region,
      endpoint: config.s3.endpoint,
      credentials: {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
      },
      forcePathStyle: config.s3.forcePathStyle,
    });
    this.bucket = config.s3.bucket;
  }

  /**
   * Faz upload de um arquivo para o S3
   * @param key - Caminho/nome do arquivo no bucket
   * @param body - Conteúdo do arquivo (Buffer, Stream ou string)
   * @param contentType - Tipo MIME do arquivo
   */
  async uploadFile(
    key: string,
    body: Buffer | Readable | string,
    contentType?: string
  ): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    await this.client.send(command);
  }

  /**
   * Faz download de um arquivo do S3
   * @param key - Caminho/nome do arquivo no bucket
   * @returns Stream do arquivo
   */
  async downloadFile(key: string): Promise<Readable> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);

    if (!response.Body) {
      throw new Error("Arquivo não encontrado ou vazio");
    }

    return response.Body as Readable;
  }

  /**
   * Deleta um arquivo do S3
   * @param key - Caminho/nome do arquivo no bucket
   */
  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  /**
   * Verifica se um arquivo existe no S3
   * @param key - Caminho/nome do arquivo no bucket
   * @returns true se o arquivo existe, false caso contrário
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (
        error.name === "NotFound" ||
        error.$metadata?.httpStatusCode === 404
      ) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Obtém metadados de um arquivo
   * @param key - Caminho/nome do arquivo no bucket
   * @returns Metadados do arquivo
   */
  async getFileMetadata(key: string): Promise<{
    size?: number;
    lastModified?: Date;
    contentType?: string;
  }> {
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);

    return {
      size: response.ContentLength,
      lastModified: response.LastModified,
      contentType: response.ContentType,
    };
  }
}
