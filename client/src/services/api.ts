/**
 * Serviço de API para comunicação com o backend
 */

import {
  getAccessToken,
  getDeviceId,
  getRefreshToken,
  saveTokens,
  clearAuth,
} from "../utils/storage";

const API_BASE_URL = "http://localhost:3000/api";

// Flag para evitar múltiplas tentativas de refresh simultâneas
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

// ==================== HELPER ====================

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const token = getAccessToken();
  const deviceId = getDeviceId();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Envia X-Device-Id para todos os endpoints, exceto /devices (para evitar conflito no registro)
  if (deviceId && !endpoint.includes("/devices")) {
    headers["X-Device-Id"] = deviceId;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Se receber 401 e não for uma retry, tenta refresh
  if (response.status === 401 && !isRetry && !endpoint.includes("/auth")) {
    try {
      await refreshAccessToken();
      // Tenta novamente com o novo token
      return fetchAPI<T>(endpoint, options, true);
    } catch {
      // Se refresh falhar, limpa autenticação e força login
      clearAuth();
      window.location.href = "/";
      throw new Error("Sessão expirada. Faça login novamente.");
    }
  }

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(error.error || `Erro ${response.status}`);
  }

  return await response.json();
}

/**
 * Renova o access token usando o refresh token
 */
async function refreshAccessToken(): Promise<string> {
  // Se já estiver renovando, aguarda a promise existente
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error("Failed to refresh token");
      }

      const data = await response.json();
      saveTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ==================== AUTH ====================

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  data: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
  };
}

export async function register(
  data: RegisterRequest
): Promise<RegisterResponse> {
  return fetchAPI<RegisterResponse>("/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  return fetchAPI<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
}

export async function refreshToken(
  data: RefreshTokenRequest
): Promise<RefreshTokenResponse> {
  return fetchAPI<RefreshTokenResponse>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ==================== DEVICES ====================

export interface RegisterDeviceRequest {
  deviceId: string;
  publicKey: string;
  publicKeyFormat: string;
  keyFingerprint: string;
}

export interface Device {
  id: string;
  deviceId: string;
  publicKey: string;
  publicKeyFormat: string;
  keyFingerprint: string;
  status: "active" | "inactive" | "revoked";
  isMasterDevice: number;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterDeviceResponse {
  message: string;
  data: Device;
}

export async function registerDevice(
  data: RegisterDeviceRequest
): Promise<RegisterDeviceResponse> {
  return fetchAPI<RegisterDeviceResponse>("/devices", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface ListDevicesResponse {
  devices: Device[];
  total?: number;
}

export async function listDevices(): Promise<ListDevicesResponse> {
  return fetchAPI<ListDevicesResponse>("/devices");
}

export interface GetDeviceResponse {
  data: Device;
}

export async function getDevice(deviceId: string): Promise<GetDeviceResponse> {
  return fetchAPI<GetDeviceResponse>(`/devices/${deviceId}`);
}

export interface RevokeDeviceResponse {
  message: string;
  data: {
    deviceId: string;
    revokedAt: string;
  };
}

export async function revokeDevice(
  deviceId: string,
  password: string,
  reason: string
): Promise<RevokeDeviceResponse> {
  return fetchAPI<RevokeDeviceResponse>(`/devices/revoke`, {
    method: "POST",
    body: JSON.stringify({ deviceId, password, reason }),
  });
}

// ==================== ENVELOPES ====================

export interface CreateEnvelopeRequest {
  deviceId: string;
  envelopeCiphertext: string;
  encryptionMetadata: {
    algorithm: string;
    hashFunction: string;
  };
}

export interface Envelope {
  id: string;
  userId: string;
  deviceId: string;
  envelopeCiphertext: string;
  encryptionMetadata: {
    algorithm: string;
    hashFunction: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateEnvelopeResponse {
  message: string;
  data: Envelope;
}

export async function createEnvelope(
  data: CreateEnvelopeRequest
): Promise<CreateEnvelopeResponse> {
  return fetchAPI<CreateEnvelopeResponse>("/envelopes", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface GetEnvelopeResponse {
  data: Envelope;
}

export async function getMyEnvelope(): Promise<GetEnvelopeResponse> {
  const deviceId = getDeviceId();
  const token = getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (deviceId) {
    headers["X-Device-Id"] = deviceId;
  }

  const response = await fetch(`${API_BASE_URL}/envelopes/me`, {
    headers,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(error.error || `Erro ${response.status}`);
  }

  return await response.json();
}

// ==================== FILES ====================

export interface InitUploadRequest {
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface InitUploadResponse {
  data: {
    uploadId: string;
    fileId: string;
    presignedUrl: string;
    expiresIn: number;
  };
}

export async function initUpload(
  data: InitUploadRequest
): Promise<InitUploadResponse> {
  return fetchAPI<InitUploadResponse>("/files/upload/init", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface CompleteUploadRequest {
  uploadId: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  encryptedFek: string;
  encryptionMetadata: {
    algorithm: string;
    iv: string;
    authTag: string;
  };
}

export interface CompleteUploadResponse {
  message: string;
  data: {
    fileId: string;
    fileName: string;
    sizeBytes: number;
    uploadedAt: string;
  };
}

export async function completeUpload(
  data: CompleteUploadRequest
): Promise<CompleteUploadResponse> {
  return fetchAPI<CompleteUploadResponse>("/files/upload/complete", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface FileMetadata {
  fileId: string;
  fileName: string;
  sizeBytes: number;
  createdAt: string;
}

export interface ListFilesResponse {
  data: {
    files: FileMetadata[];
    total: number;
    page: number;
    limit: number;
  };
}

export async function listFiles(
  page = 1,
  limit = 20
): Promise<ListFilesResponse> {
  return fetchAPI<ListFilesResponse>(`/files?page=${page}&limit=${limit}`);
}

export interface DownloadFileResponse {
  data: {
    fileId: string;
    fileName: string;
    presignedUrl: string;
    encryptedFek: string;
    encryptionMetadata: {
      algorithm: string;
      iv: string;
      authTag: string;
    };
    expiresIn: number;
  };
}

export async function getDownloadUrl(
  fileId: string
): Promise<DownloadFileResponse> {
  return fetchAPI<DownloadFileResponse>(`/files/${fileId}/download`);
}
