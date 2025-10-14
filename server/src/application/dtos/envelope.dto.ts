import { z } from "zod";

// Schema para criar um novo envelope (sincronizar MDK)
export const CreateEnvelopeSchema = z.object({
  deviceId: z.string().min(1, "deviceId é obrigatório"),
  envelopeCiphertext: z
    .string()
    .min(1, "envelopeCiphertext é obrigatório")
    .describe("MDK criptografada com a chave pública do dispositivo"),
  encryptionMetadata: z.object({
    algorithm: z
      .string()
      .default("RSA-OAEP")
      .describe("Algoritmo de criptografia assimétrica"),
    hashFunction: z
      .string()
      .default("SHA-256")
      .describe("Função hash usada no algoritmo"),
  }),
});

export type CreateEnvelopeDTO = z.infer<typeof CreateEnvelopeSchema>;

// Schema de resposta do envelope criado
export const EnvelopeCreatedResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    id: z.string(),
    deviceId: z.string(),
    createdAt: z.string(),
  }),
});

// Schema de resposta completa do envelope (com dados criptografados)
export const EnvelopeDataResponseSchema = z.object({
  data: z.object({
    id: z.string(),
    envelopeCiphertext: z.string(),
    encryptionMetadata: z.object({
      algorithm: z.string(),
      hashFunction: z.string(),
    }),
  }),
});

// Schema de erro
export const ErrorResponseSchema = z.object({
  error: z.string(),
});

export type EnvelopeCreatedResponseDTO = z.infer<
  typeof EnvelopeCreatedResponseSchema
>;
export type EnvelopeDataResponseDTO = z.infer<
  typeof EnvelopeDataResponseSchema
>;
