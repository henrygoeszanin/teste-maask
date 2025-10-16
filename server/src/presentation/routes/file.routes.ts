import { FastifyInstance } from "fastify";
import { FileController } from "@/presentation/controllers/FileController";
import { authenticate } from "@/presentation/middlewares/authenticate";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  InitUploadSchema,
  InitUploadResponseSchema,
  CompleteUploadSchema,
  CompleteUploadResponseSchema,
  DownloadFileResponseSchema,
  ListFilesQuerySchema,
  ListFilesResponseSchema,
  FileIdParamSchema,
  UpdateFileSchema,
  UpdateFileResponseSchema,
  DeleteFileResponseSchema,
  ErrorResponseSchema,
} from "@application/dtos/file.dto";
import { withExamples } from "../utils";
import { uploadRateLimiter } from "../middlewares/rateLimiters";

export function fileRoutes(app: FastifyInstance) {
  // Iniciar upload
  app.withTypeProvider<ZodTypeProvider>().post(
    "/files/upload/init",
    {
      preHandler: [authenticate],
      config: {
        rateLimit: uploadRateLimiter,
      },
      schema: {
        tags: ["Files"],
        description:
          "Inicia um upload de arquivo e retorna presigned URL para upload direto ao Supabase Storage (requer Bearer token, rate limit: 10 uploads / hora)",
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
                  "https://txuiaqcmkhttexzhijmp.supabase.co/storage/v1/object/upload/sign/user-data/...",
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
          429: withExamples(ErrorResponseSchema, [
            { error: "Upload limit exceeded. Please try again later." },
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
      preHandler: [authenticate],
      schema: {
        tags: ["Files"],
        description:
          "Completa o upload salvando metadados de criptografia no banco (requer Bearer token)",
        body: withExamples(CompleteUploadSchema, [
          {
            uploadId: "upload-uuid-123",
            fileId: "file-uuid-456",
            fileName: "profile-browser.zip",
            fileSize: 104857600,
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
      preHandler: [authenticate],
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
                  "https://txuiaqcmkhttexzhijmp.supabase.co/storage/v1/object/sign/user-data/...",
                expiresIn: 3600,
              },
            },
          ]),
          401: withExamples(ErrorResponseSchema, [
            { error: "Token not provided" },
          ]),
          404: withExamples(ErrorResponseSchema, [{ error: "File not found" }]),
          410: withExamples(ErrorResponseSchema, [
            {
              error:
                "Este arquivo foi carregado com uma versão antiga do sistema e não pode ser baixado. Por favor, faça o upload novamente.",
            },
          ]),
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
      preHandler: [authenticate],
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

  // Atualizar arquivo
  app.withTypeProvider<ZodTypeProvider>().put(
    "/files/:fileId",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["Files"],
        description:
          "Atualiza um arquivo existente retornando presigned URL para upload do novo conteúdo (requer Bearer token)",
        params: FileIdParamSchema,
        body: withExamples(UpdateFileSchema, [
          {
            fileName: "profile-browser-updated.zip",
            fileSize: 157286400,
          },
        ]),
        response: {
          200: withExamples(UpdateFileResponseSchema, [
            {
              data: {
                uploadId: "upload-uuid-789",
                fileId: "file-uuid-456",
                presignedUrl:
                  "https://txuiaqcmkhttexzhijmp.supabase.co/storage/v1/object/upload/sign/user-data/...",
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
          403: withExamples(ErrorResponseSchema, [
            { error: "Unauthorized to update this file" },
          ]),
          404: withExamples(ErrorResponseSchema, [{ error: "File not found" }]),
        },
        security: [{ bearerAuth: [] }],
      },
    },
    FileController.update
  );

  // Deletar arquivo
  app.withTypeProvider<ZodTypeProvider>().delete(
    "/files/:fileId",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["Files"],
        description:
          "Deleta um arquivo do storage e do banco de dados (requer Bearer token)",
        params: FileIdParamSchema,
        response: {
          200: withExamples(DeleteFileResponseSchema, [
            {
              message: "Arquivo deletado com sucesso",
              data: {
                fileId: "file-uuid-456",
                fileName: "profile-browser.zip",
                deletedAt: "2025-10-14T12:05:00.000Z",
              },
            },
          ]),
          401: withExamples(ErrorResponseSchema, [
            { error: "Token not provided" },
          ]),
          403: withExamples(ErrorResponseSchema, [
            { error: "Unauthorized to delete this file" },
          ]),
          404: withExamples(ErrorResponseSchema, [{ error: "File not found" }]),
        },
        security: [{ bearerAuth: [] }],
      },
    },
    FileController.delete
  );
}
