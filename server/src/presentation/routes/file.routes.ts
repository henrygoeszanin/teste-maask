import { FastifyInstance } from "fastify";
import { FileController } from "@/presentation/controllers/FileController";
import { authenticate } from "@/presentation/middlewares/authenticate";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  InitUploadSchema,
  InitUploadResponseSchema,
  CompleteUploadSchema,
  CompleteUploadResponseSchema,
  DownloadFileResponseSchema,
  ListFilesQuerySchema,
  ListFilesResponseSchema,
  FileIdParamSchema,
  ErrorResponseSchema,
} from "@application/dtos/file.dto";

// Helper para adicionar exemplos aos schemas Zod
function withExamples<T extends z.ZodType<any>>(zodSchema: T, examples: any[]) {
  const schemaWithExamples = zodSchema as T & { _examples?: any[] };
  (schemaWithExamples as any)._examples = examples;
  return schemaWithExamples;
}

export async function fileRoutes(app: FastifyInstance) {
  // Iniciar upload
  app.withTypeProvider<ZodTypeProvider>().post(
    "/files/upload/init",
    {
      preHandler: authenticate,
      schema: {
        tags: ["Files"],
        description:
          "Inicia um upload de arquivo e retorna presigned URL para upload direto ao S3 (requer Bearer token)",
        body: withExamples(InitUploadSchema, [
          {
            fileName: "profile-browser.zip",
            fileSize: 104857600,
            mimeType: "application/zip",
          },
        ]),
        response: {
          200: withExamples(InitUploadResponseSchema, [
            {
              data: {
                uploadId: "upload-uuid-123",
                fileId: "file-uuid-456",
                presignedUrl:
                  "https://s3.amazonaws.com/bucket/file?signature=...",
                expiresIn: 3600,
              },
            },
          ]),
          400: withExamples(ErrorResponseSchema, [
            { error: "Invalid request body" },
          ]),
          401: withExamples(ErrorResponseSchema, [
            { error: "Token not provided" },
          ]),
        },
        security: [{ bearerAuth: [] }],
      },
    },
    FileController.initUpload
  );

  // Completar upload
  app.withTypeProvider<ZodTypeProvider>().post(
    "/files/upload/complete",
    {
      preHandler: authenticate,
      schema: {
        tags: ["Files"],
        description:
          "Completa o upload salvando metadados de criptografia no banco (requer Bearer token)",
        body: withExamples(CompleteUploadSchema, [
          {
            uploadId: "upload-uuid-123",
            encryptedFek: "encrypted-fek-base64-content",
            encryptionMetadata: {
              algorithm: "AES-256-GCM",
              iv: "iv-base64",
              authTag: "auth-tag-base64",
            },
          },
        ]),
        response: {
          200: withExamples(CompleteUploadResponseSchema, [
            {
              message: "Upload completado com sucesso",
              data: {
                fileId: "file-uuid-456",
                fileName: "profile-browser.zip",
                sizeBytes: 104857600,
                uploadedAt: "2025-10-14T12:00:00.000Z",
              },
            },
          ]),
          400: withExamples(ErrorResponseSchema, [
            { error: "Invalid request body" },
          ]),
          401: withExamples(ErrorResponseSchema, [
            { error: "Token not provided" },
          ]),
          404: withExamples(ErrorResponseSchema, [
            { error: "Upload not found" },
          ]),
        },
        security: [{ bearerAuth: [] }],
      },
    },
    FileController.completeUpload
  );

  // Download de arquivo
  app.withTypeProvider<ZodTypeProvider>().get(
    "/files/:fileId/download",
    {
      preHandler: authenticate,
      schema: {
        tags: ["Files"],
        description:
          "Obtém presigned URL e metadados de criptografia para download (requer Bearer token)",
        params: FileIdParamSchema,
        response: {
          200: withExamples(DownloadFileResponseSchema, [
            {
              data: {
                fileId: "file-uuid-456",
                fileName: "profile-browser.zip",
                presignedUrl:
                  "https://s3.amazonaws.com/bucket/file?signature=...",
                encryptedFek: "encrypted-fek-base64-content",
                encryptionMetadata: {
                  algorithm: "AES-256-GCM",
                  iv: "iv-base64",
                  authTag: "auth-tag-base64",
                },
                expiresIn: 3600,
              },
            },
          ]),
          401: withExamples(ErrorResponseSchema, [
            { error: "Token not provided" },
          ]),
          404: withExamples(ErrorResponseSchema, [{ error: "File not found" }]),
        },
        security: [{ bearerAuth: [] }],
      },
    },
    FileController.download
  );

  // Listar arquivos
  app.withTypeProvider<ZodTypeProvider>().get(
    "/files",
    {
      preHandler: authenticate,
      schema: {
        tags: ["Files"],
        description:
          "Lista todos os arquivos do usuário autenticado (requer Bearer token)",
        querystring: ListFilesQuerySchema,
        response: {
          200: withExamples(ListFilesResponseSchema, [
            {
              data: {
                files: [
                  {
                    fileId: "file-uuid-456",
                    fileName: "profile-browser.zip",
                    sizeBytes: 104857600,
                    createdAt: "2025-10-14T12:00:00.000Z",
                  },
                  {
                    fileId: "file-uuid-789",
                    fileName: "backup.zip",
                    sizeBytes: 52428800,
                    createdAt: "2025-10-13T10:30:00.000Z",
                  },
                ],
                total: 2,
                page: 1,
                limit: 20,
              },
            },
          ]),
          401: withExamples(ErrorResponseSchema, [
            { error: "Token not provided" },
          ]),
        },
        security: [{ bearerAuth: [] }],
      },
    },
    FileController.list
  );
}
