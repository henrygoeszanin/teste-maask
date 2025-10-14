import { FastifyInstance } from "fastify";
import { EnvelopeController } from "@/presentation/controllers/EnvelopeController";
import { authenticate } from "@/presentation/middlewares/authenticate";
import { z } from "zod";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  CreateEnvelopeSchema,
  EnvelopeCreatedResponseSchema,
  EnvelopeDataResponseSchema,
  ErrorResponseSchema,
} from "@application/dtos/envelope.dto";

// Helper para adicionar exemplos aos schemas Zod
function withExamples<T extends z.ZodType<any>>(zodSchema: T, examples: any[]) {
  const schemaWithExamples = zodSchema as T & { _examples?: any[] };
  (schemaWithExamples as any)._examples = examples;
  return schemaWithExamples;
}

export async function envelopeRoutes(app: FastifyInstance) {
  // Criar envelope (sincronizar MDK)
  app.withTypeProvider<ZodTypeProvider>().post(
    "/envelopes",
    {
      preHandler: authenticate,
      schema: {
        tags: ["Envelopes"],
        description:
          "Cria um novo envelope para sincronizar a MDK com um dispositivo (requer Bearer token)",
        body: withExamples(CreateEnvelopeSchema, [
          {
            deviceId: "device-uuid-123",
            envelopeCiphertext: "encrypted-mdk-base64-content",
            encryptionMetadata: {
              algorithm: "RSA-OAEP",
              hashFunction: "SHA-256",
            },
          },
        ]),
        response: {
          201: withExamples(EnvelopeCreatedResponseSchema, [
            {
              message: "Envelope criado com sucesso",
              data: {
                id: "envelope-uuid-123",
                deviceId: "device-uuid-123",
                createdAt: "2025-10-14T12:00:00.000Z",
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
            { error: "Device not found" },
          ]),
        },
        security: [{ bearerAuth: [] }],
      },
    },
    EnvelopeController.create
  );

  // Obter envelope do dispositivo atual
  app.withTypeProvider<ZodTypeProvider>().get(
    "/envelopes/me",
    {
      preHandler: authenticate,
      schema: {
        tags: ["Envelopes"],
        description:
          "Obtém o envelope do dispositivo atual (requer header X-Device-Id e Bearer token)",
        headers: z.object({
          "x-device-id": z.string().min(1, "Device ID é obrigatório"),
        }),
        response: {
          200: withExamples(EnvelopeDataResponseSchema, [
            {
              data: {
                id: "envelope-uuid-123",
                envelopeCiphertext: "encrypted-mdk-base64-content",
                encryptionMetadata: {
                  algorithm: "RSA-OAEP",
                  hashFunction: "SHA-256",
                },
              },
            },
          ]),
          401: withExamples(ErrorResponseSchema, [
            { error: "Token not provided" },
          ]),
          404: withExamples(ErrorResponseSchema, [
            { error: "Envelope not found for this device" },
          ]),
        },
        security: [{ bearerAuth: [] }],
      },
    },
    EnvelopeController.getMyEnvelope
  );
}
