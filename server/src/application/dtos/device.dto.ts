import { z } from "zod";

// Schema para registrar um novo dispositivo
export const RegisterDeviceSchema = z.object({
  deviceName: z
    .string()
    .min(1, "deviceName é obrigatório")
    .max(100, "deviceName deve ter no máximo 100 caracteres"),
});

export type RegisterDeviceDTO = z.infer<typeof RegisterDeviceSchema>;

// Schema de resposta para dispositivo registrado
export const DeviceResponseSchema = z.object({
  id: z.string(),
  deviceName: z.string(),
  status: z.enum(["active", "inactive", "revoked"]),
  createdAt: z.string().datetime(),
});

// Schema de resposta para lista de dispositivos
export const DeviceListItemSchema = z.object({
  id: z.string(), // ULID
  deviceName: z.string(),
  status: z.enum(["active", "inactive", "revoked"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const DeviceListResponseSchema = z.object({
  devices: z.array(DeviceListItemSchema),
});

// Schema de resposta para revogação de dispositivo
export const DeviceRevokeResponseSchema = z.object({
  message: z.string(),
  deviceName: z.string(),
  status: z.enum(["active", "inactive", "revoked"]),
});

// Schema de erro
export const DeviceErrorResponseSchema = z.object({
  error: z.string(),
});

// Mantém compatibilidade com código existente
export const registerDeviceSchema = RegisterDeviceSchema;

// Schema para listar dispositivos (query params)
export const listDevicesSchema = z.object({
  status: z
    .enum(["active", "inactive", "revoked", "all"])
    .optional()
    .default("all"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListDevicesDTO = z.infer<typeof listDevicesSchema>;

// Schema para revogar/atualizar dispositivo
export const updateDeviceStatusSchema = z.object({
  status: z.enum(["active", "inactive", "revoked"]),
});

export type UpdateDeviceStatusDTO = z.infer<typeof updateDeviceStatusSchema>;

// Schema para revogar dispositivo (requer senha)
export const RevokeDeviceSchema = z.object({
  deviceName: z.string().min(1, "deviceName é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
  reason: z
    .enum(["lost", "stolen", "suspicious", "employee_exit", "user_initiated"])
    .optional()
    .describe("Motivo da revogação"),
});

export type RevokeDeviceDTO = z.infer<typeof RevokeDeviceSchema>;

// Schema de resposta para revogação
export const RevokeDeviceResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    deviceName: z.string(),
    revokedAt: z.string().datetime(),
  }),
});

// Schema para autorizar dispositivo
export const AuthorizeDeviceSchema = z.object({
  targetDeviceName: z.string().min(1, "targetDeviceName é obrigatório"),
});

export type AuthorizeDeviceDTO = z.infer<typeof AuthorizeDeviceSchema>;

// Schema de resposta para autorização de dispositivo
export const AuthorizeDeviceResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    deviceName: z.string(),
    authorizedAt: z.string().datetime(),
  }),
});

// Schema para deletar dispositivo (params)
export const DeleteDeviceParamSchema = z.object({
  deviceId: z.string().min(1, "deviceId é obrigatório"),
});

export type DeleteDeviceParamDTO = z.infer<typeof DeleteDeviceParamSchema>;

// Schema de resposta para deleção de dispositivo
export const DeleteDeviceResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    deviceId: z.string(),
    deviceName: z.string(),
    deletedAt: z.string().datetime(),
  }),
});
