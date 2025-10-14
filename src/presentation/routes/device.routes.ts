import { FastifyInstance } from "fastify";
import { DeviceController } from "@/presentation/controllers/DeviceController";
import { authenticate } from "@/presentation/middlewares/authenticate";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  RegisterDeviceSchema,
  DeviceResponseSchema,
  DeviceListResponseSchema,
  DeviceRevokeResponseSchema,
  DeviceErrorResponseSchema,
} from "@/application/dtos/device.dto";

// Helper para adicionar exemplos aos schemas Zod
function withExamples<T extends z.ZodType<any>>(zodSchema: T, examples: any[]) {
  const schemaWithExamples = zodSchema as T & { _examples?: any[] };
  (schemaWithExamples as any)._examples = examples;
  return schemaWithExamples;
}

export async function deviceRoutes(app: FastifyInstance) {
  // Registrar novo dispositivo
  app.withTypeProvider<ZodTypeProvider>().post(
    "/devices",
    {
      preHandler: authenticate,
      schema: {
        tags: ["Devices"],
        description:
          "Registra um novo dispositivo para o usuário autenticado (requer Bearer token)",
        body: withExamples(RegisterDeviceSchema, [
          {
            deviceId: "550e8400-e29b-41d4-a716-446655440000",
            publicKey:
              "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----",
            publicKeyFormat: "PEM",
            keyFingerprint:
              "a7b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3",
          },
        ]),
        response: {
          201: withExamples(DeviceResponseSchema, [
            {
              id: "123e4567-e89b-12d3-a456-426614174000",
              deviceId: "550e8400-e29b-41d4-a716-446655440000",
              status: "active",
              createdAt: "2025-10-14T12:00:00.000Z",
            },
          ]),
          401: withExamples(DeviceErrorResponseSchema, [
            { error: "Token not provided" },
          ]),
        },
        security: [{ bearerAuth: [] }],
      },
    },
    DeviceController.register
  );

  // Listar dispositivos do usuário
  app.withTypeProvider<ZodTypeProvider>().get(
    "/devices",
    {
      preHandler: authenticate,
      schema: {
        tags: ["Devices"],
        description:
          "Lista todos os dispositivos do usuário autenticado (requer Bearer token)",
        response: {
          200: withExamples(DeviceListResponseSchema, [
            {
              devices: [
                {
                  id: "123e4567-e89b-12d3-a456-426614174000",
                  deviceId: "550e8400-e29b-41d4-a716-446655440000",
                  keyFingerprint:
                    "a7b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3",
                  status: "active",
                  createdAt: "2025-10-14T12:00:00.000Z",
                },
              ],
            },
          ]),
          401: withExamples(DeviceErrorResponseSchema, [
            { error: "Token not provided" },
          ]),
        },
        security: [{ bearerAuth: [] }],
      },
    },
    DeviceController.list
  );

  // Revogar (desativar) dispositivo
  app.withTypeProvider<ZodTypeProvider>().delete(
    "/devices/:deviceId",
    {
      preHandler: authenticate,
      schema: {
        tags: ["Devices"],
        description: "Revoga (desativa) um dispositivo (requer Bearer token)",
        params: z.object({
          deviceId: z.string().uuid("deviceId deve ser um UUID válido"),
        }),
        response: {
          200: withExamples(DeviceRevokeResponseSchema, [
            {
              message: "Device revoked successfully",
              deviceId: "550e8400-e29b-41d4-a716-446655440000",
              status: "inactive",
            },
          ]),
          401: withExamples(DeviceErrorResponseSchema, [
            { error: "Token not provided" },
          ]),
          403: withExamples(DeviceErrorResponseSchema, [
            { error: "You do not have permission to revoke this device" },
          ]),
          404: withExamples(DeviceErrorResponseSchema, [
            { error: "Device not found" },
          ]),
        },
        security: [{ bearerAuth: [] }],
      },
    },
    DeviceController.revoke
  );
}
