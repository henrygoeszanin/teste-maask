import { z } from "zod";

// Schema para registrar um novo dispositivo
export const RegisterDeviceSchema = z.object({
  deviceId: z.uuid("deviceId deve ser um UUID válido"),
  publicKey: z
    .string()
    .min(100, "publicKey deve ter pelo menos 100 caracteres")
    .regex(
      /^-----BEGIN PUBLIC KEY-----/,
      "publicKey deve estar em formato PEM"
    ),
  publicKeyFormat: z
    .enum(["PEM", "SPKI"])
    .default("PEM")
    .describe("Formato da chave pública"),
  keyFingerprint: z
    .string()
    .length(64, "keyFingerprint deve ser um hash SHA-256 (64 caracteres hex)")
    .regex(/^[a-f0-9]{64}$/i, "keyFingerprint deve ser hexadecimal"),
});

export type RegisterDeviceDTO = z.infer<typeof RegisterDeviceSchema>;

// Schema de resposta para dispositivo registrado
export const DeviceResponseSchema = z.object({
  id: z.string(),
  deviceId: z.uuid(),
  status: z.enum(["active", "inactive"]),
  createdAt: z.string().datetime(),
});

// Schema de resposta para lista de dispositivos
export const DeviceListItemSchema = z.object({
  id: z.string(), // ULID, não UUID
  deviceId: z.string().uuid(),
  keyFingerprint: z.string(),
  status: z.enum(["active", "inactive"]),
  createdAt: z.string().datetime(),
});

export const DeviceListResponseSchema = z.object({
  devices: z.array(DeviceListItemSchema),
});

// Schema de resposta para revogação de dispositivo
export const DeviceRevokeResponseSchema = z.object({
  message: z.string(),
  deviceId: z.string().uuid(),
  status: z.enum(["active", "inactive"]),
});

// Schema de erro
export const DeviceErrorResponseSchema = z.object({
  error: z.string(),
});

// Mantém compatibilidade com código existente
export const registerDeviceSchema = RegisterDeviceSchema;

// Schema para listar dispositivos (query params)
export const listDevicesSchema = z.object({
  status: z.enum(["active", "inactive", "all"]).optional().default("all"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListDevicesDTO = z.infer<typeof listDevicesSchema>;

// Schema para revogar/atualizar dispositivo
export const updateDeviceStatusSchema = z.object({
  status: z.enum(["active", "inactive"]),
});

export type UpdateDeviceStatusDTO = z.infer<typeof updateDeviceStatusSchema>;
