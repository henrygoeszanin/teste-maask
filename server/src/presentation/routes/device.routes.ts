import { FastifyInstance } from "fastify";
import { DeviceController } from "@/presentation/controllers/DeviceController";
import { SocketGateway } from "@/presentation/gateways/SocketGateway";
import { authenticate } from "@/presentation/middlewares/authenticate";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  DeviceListResponseSchema,
  DeviceErrorResponseSchema,
  RegisterDeviceSchema,
  DeviceResponseSchema,
  RevokeDeviceResponseSchema,
  RevokeDeviceSchema,
  DeleteDeviceParamSchema,
  DeleteDeviceResponseSchema,
} from "@/application/dtos/device.dto";
import { withExamples } from "../utils";
import z from "zod";

export async function deviceRoutes(
  app: FastifyInstance,
  options: { socketGateway: SocketGateway }
) {
  const deviceController = new DeviceController(options.socketGateway);

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
            deviceName: "Web-Win32-1744392847291",
          },
        ]),
        response: {
          201: withExamples(DeviceResponseSchema, [
            {
              id: "device-ulid-123",
              deviceName: "Meu notebook pessoal",
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
    deviceController.register.bind(deviceController)
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
                  id: "device-ulid-123",
                  deviceName: "Meu notebook pessoal",
                  status: "active",
                  createdAt: "2025-10-14T12:00:00.000Z",
                  updatedAt: "2025-10-14T12:00:00.000Z",
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
    deviceController.list.bind(deviceController)
  );

  // Buscar dispositivo específico por ID
  app.withTypeProvider<ZodTypeProvider>().get(
    "/devices/:id",
    {
      preHandler: authenticate,
      schema: {
        tags: ["Devices"],
        description:
          "Busca um dispositivo específico por ID (requer Bearer token)",
        params: DeleteDeviceParamSchema,
        response: {
          200: withExamples(DeviceResponseSchema, [
            {
              id: "device-ulid-123",
              deviceName: "Meu notebook pessoal",
              status: "active",
              createdAt: "2025-10-14T12:00:00.000Z",
            },
          ]),
          404: withExamples(DeviceErrorResponseSchema, [
            { error: "Device not found" },
          ]),
          403: withExamples(DeviceErrorResponseSchema, [
            { error: "You do not have permission to access this device" },
          ]),
          401: withExamples(DeviceErrorResponseSchema, [
            { error: "Token not provided" },
          ]),
        },
        security: [{ bearerAuth: [] }],
      },
    },
    deviceController.getById.bind(deviceController)
  );

  // ⚠️ Revogar dispositivo com segurança reforçada (requer senha)
  app.withTypeProvider<ZodTypeProvider>().post(
    "/devices/revoke",
    {
      preHandler: authenticate,
      schema: {
        tags: ["Devices"],
        description:
          "⚠️ Revoga um dispositivo de forma SEGURA (requer senha do usuário). " +
          "Proteções: senha obrigatória, dispositivo não pode revogar a si mesmo, " +
          "apenas master devices podem revogar outros master devices",
        headers: z.object({
          "x-device-name": z.string().min(1, "Device name é obrigatório"),
        }),
        body: withExamples(RevokeDeviceSchema, [
          {
            deviceName: "Web-Win32-1744392847291",
            password: "SenhaDoUsuario123!",
            reason: "user_initiated",
          },
        ]),
        response: {
          200: withExamples(RevokeDeviceResponseSchema, [
            {
              message: "Device revoked successfully",
              data: {
                deviceName: "Web-Win32-1744392847291",
                revokedAt: "2025-10-14T12:05:00.000Z",
              },
            },
          ]),
          400: withExamples(DeviceErrorResponseSchema, [
            { error: "Missing X-Device-Name header" },
            { error: "Cannot revoke your current device" },
          ]),
          401: withExamples(DeviceErrorResponseSchema, [
            { error: "Invalid password. Revocation denied." },
          ]),
          403: withExamples(DeviceErrorResponseSchema, [
            {
              error:
                "Only master devices can revoke other master devices. Please use your primary device.",
            },
          ]),
          404: withExamples(DeviceErrorResponseSchema, [
            { error: "Device to revoke not found" },
          ]),
        },
        security: [{ bearerAuth: [] }],
      },
    },
    deviceController.revokeDevice.bind(deviceController)
  );

  // Deletar dispositivo revogado
  app.withTypeProvider<ZodTypeProvider>().delete(
    "/devices/:deviceId",
    {
      preHandler: authenticate,
      schema: {
        tags: ["Devices"],
        description:
          "Deleta um dispositivo revogado (requer Bearer token). Apenas dispositivos com status 'revoked' podem ser deletados.",
        params: DeleteDeviceParamSchema,
        response: {
          200: withExamples(DeleteDeviceResponseSchema, [
            {
              message: "Dispositivo deletado com sucesso",
              data: {
                deviceId: "device-ulid-123",
                deviceName: "Web-Win32-1744392847291",
                deletedAt: "2025-10-14T12:05:00.000Z",
              },
            },
          ]),
          400: withExamples(DeviceErrorResponseSchema, [
            {
              error:
                "Only revoked devices can be deleted. Revoke the device first.",
            },
          ]),
          401: withExamples(DeviceErrorResponseSchema, [
            { error: "Token not provided" },
          ]),
          403: withExamples(DeviceErrorResponseSchema, [
            { error: "Unauthorized to delete this device" },
          ]),
          404: withExamples(DeviceErrorResponseSchema, [
            { error: "Device not found" },
          ]),
        },
        security: [{ bearerAuth: [] }],
      },
    },
    deviceController.delete.bind(deviceController)
  );
}
