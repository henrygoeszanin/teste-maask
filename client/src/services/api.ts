/**
 * Serviço de API para comunicação com o backend
 */

import {
  getAccessToken,
  getRefreshToken,
  saveTokens,
  clearTokens,
  getDeviceName,
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
  const deviceName = getDeviceName();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Envia X-Device-Name para endpoints que precisam identificar o dispositivo
  if (deviceName && endpoint.includes("/devices/revoke")) {
    headers["X-Device-Name"] = deviceName;
  }

  console.log("[API] Request:", endpoint, options);
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && !isRetry && !endpoint.includes("/auth")) {
    console.warn(
      "[API] 401 recebido em",
      endpoint,
      "- tentando refresh token..."
    );
    try {
      await refreshAccessToken();
      console.log("[API] Token renovado, refazendo request:", endpoint);
      return fetchAPI<T>(endpoint, options, true);
    } catch (err) {
      console.error("[API] Falha ao renovar token:", err);
      clearTokens();
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
    console.log("[API] Já está renovando token, aguardando...");
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken || refreshToken.length < 10) {
        console.error("[API] RefreshToken inválido ou ausente");
        throw new Error("No refresh token available");
      }

      console.log("[API] Fazendo request de refresh token...");
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("[API] Falha no refresh token:", response.status, text);
        throw new Error("Failed to refresh token");
      }

      const data = await response.json();
      // Salva apenas o novo accessToken, mantém o refreshToken existente
      const currentRefreshToken = getRefreshToken();
      if (currentRefreshToken) {
        saveTokens(data.accessToken, currentRefreshToken);
      }
      console.log("[API] Access token renovado");
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
  criptografyCode: string; // Código de criptografia gerado no registro
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
  expiresIn: number;
  refreshExpiresIn: number;
  user: {
    id: string;
    name: string;
    email: string;
  };
  criptografyCode: string; // Código de criptografia do usuário (retornado no nível raiz)
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
  deviceName: string; // Nome único do dispositivo
}

export interface Device {
  id: string;
  deviceName: string;
  status: "active" | "inactive" | "revoked";
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
    deviceName: string;
    revokedAt: string;
  };
}

export async function revokeDevice(
  deviceName: string,
  password: string,
  reason: string
): Promise<RevokeDeviceResponse> {
  return fetchAPI<RevokeDeviceResponse>("/devices/revoke", {
    method: "POST",
    body: JSON.stringify({ deviceName, password, reason }),
  });
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
    expiresIn: number;
    // Removidos: encryptedFek, fekEncryptionMetadata, fileEncryptionMetadata
  };
}

export async function getDownloadUrl(
  fileId: string
): Promise<DownloadFileResponse> {
  return fetchAPI<DownloadFileResponse>(`/files/${fileId}/download`);
}
