import { z } from "zod";

// Schema para iniciar upload
export const InitUploadSchema = z.object({
  fileName: z
    .string()
    .min(1, "fileName é obrigatório")
    .max(255, "fileName deve ter no máximo 255 caracteres"),
  fileSize: z.coerce
    .number()
    .int()
    .positive("fileSize deve ser positivo")
    .max(
      500 * 1024 * 1024,
      "fileSize deve ser no máximo 500MB (524288000 bytes)"
    ),
  mimeType: z.string().optional().describe("Tipo MIME do arquivo"),
});

export type InitUploadDTO = z.infer<typeof InitUploadSchema>;

// Schema de resposta do init upload
export const InitUploadResponseSchema = z.object({
  data: z.object({
    uploadId: z.string(),
    fileId: z.string(),
    presignedUrl: z.string(),
    expiresIn: z.number(),
  }),
});

export type InitUploadResponseDTO = z.infer<typeof InitUploadResponseSchema>;

// Schema para completar upload
export const CompleteUploadSchema = z.object({
  uploadId: z.string().min(1, "uploadId é obrigatório"),
  fileId: z.string().min(1, "fileId é obrigatório"),
  fileName: z.string().min(1, "fileName é obrigatório"),
  fileSize: z.number().int().positive("fileSize deve ser maior que 0"),
  encryptedFek: z
    .string()
    .min(1, "encryptedFek é obrigatório")
    .describe("FEK criptografada pela MDK em base64"),
  fekEncryptionMetadata: z.object({
    algorithm: z
      .string()
      .default("AES-256-GCM")
      .describe("Algoritmo usado para criptografar a FEK"),
    iv: z
      .string()
      .min(1, "iv é obrigatório")
      .describe("IV usado para criptografar a FEK em base64"),
    authTag: z
      .string()
      .min(1, "authTag é obrigatório")
      .describe("AuthTag da criptografia da FEK em base64"),
  }),
  fileEncryptionMetadata: z.object({
    algorithm: z
      .string()
      .default("AES-256-GCM")
      .describe("Algoritmo usado para criptografar o arquivo"),
    iv: z
      .string()
      .min(1, "iv é obrigatório")
      .describe("IV usado para criptografar o arquivo em base64"),
    authTag: z
      .string()
      .min(1, "authTag é obrigatório")
      .describe("AuthTag da criptografia do arquivo em base64"),
  }),
});

export type CompleteUploadDTO = z.infer<typeof CompleteUploadSchema>;

// Schema de resposta do complete upload
export const CompleteUploadResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    fileId: z.string(),
    fileName: z.string(),
    sizeBytes: z.number(),
    uploadedAt: z.string(),
  }),
});

export type CompleteUploadResponseDTO = z.infer<
  typeof CompleteUploadResponseSchema
>;

// Schema de resposta do download
export const DownloadFileResponseSchema = z.object({
  data: z.object({
    fileId: z.string(),
    fileName: z.string(),
    presignedUrl: z.string(),
    encryptedFek: z.string(),
    fekEncryptionMetadata: z.object({
      algorithm: z.string(),
      iv: z.string(),
      authTag: z.string(),
    }),
    fileEncryptionMetadata: z.object({
      algorithm: z.string(),
      iv: z.string(),
      authTag: z.string(),
    }),
    expiresIn: z.number(),
  }),
});

export type DownloadFileResponseDTO = z.infer<
  typeof DownloadFileResponseSchema
>;

// Schema para listar arquivos (query params)
export const ListFilesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListFilesQueryDTO = z.infer<typeof ListFilesQuerySchema>;

// Schema de resposta da listagem de arquivos
export const ListFilesResponseSchema = z.object({
  data: z.object({
    files: z.array(
      z.object({
        fileId: z.string(),
        fileName: z.string(),
        sizeBytes: z.number(),
        createdAt: z.string(),
      })
    ),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export type ListFilesResponseDTO = z.infer<typeof ListFilesResponseSchema>;

// Schema de parâmetros de rota
export const FileIdParamSchema = z.object({
  fileId: z.string().uuid("fileId deve ser um UUID válido"),
});

export type FileIdParamDTO = z.infer<typeof FileIdParamSchema>;

// Schema de erro
export const ErrorResponseSchema = z.object({
  error: z.string(),
});
