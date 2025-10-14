/**
 * Armazenamento local para dados sensíveis
 * Usa localStorage para persistência
 */

import { exportPrivateKeyToPEM, importPrivateKeyFromPEM } from "./crypto";

const STORAGE_KEYS = {
  ACCESS_TOKEN: "maask_access_token",
  REFRESH_TOKEN: "maask_refresh_token",
  DEVICE_ID: "maask_device_id",
  PRIVATE_KEY: "maask_private_key",
  USER_EMAIL: "maask_user_email",
} as const;

// MDK é armazenada apenas em memória (nunca em localStorage)
let mdkInMemory: CryptoKey | null = null;

// ==================== TOKEN ====================

export function saveTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
}

export function clearTokens() {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
}

// ==================== DEVICE ID ====================

export function saveDeviceId(deviceId: string) {
  localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
}

export function getDeviceId(): string | null {
  return localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
}

export function clearDeviceId() {
  localStorage.removeItem(STORAGE_KEYS.DEVICE_ID);
}

// ==================== PRIVATE KEY ====================

export async function savePrivateKey(privateKey: CryptoKey) {
  const pem = await exportPrivateKeyToPEM(privateKey);
  localStorage.setItem(STORAGE_KEYS.PRIVATE_KEY, pem);
}

export async function getPrivateKey(): Promise<CryptoKey | null> {
  const pem = localStorage.getItem(STORAGE_KEYS.PRIVATE_KEY);
  if (!pem) return null;

  try {
    return await importPrivateKeyFromPEM(pem);
  } catch (error) {
    console.error("Erro ao importar chave privada:", error);
    return null;
  }
}

export function clearPrivateKey() {
  localStorage.removeItem(STORAGE_KEYS.PRIVATE_KEY);
}

// ==================== USER EMAIL ====================

export function saveUserEmail(email: string) {
  localStorage.setItem(STORAGE_KEYS.USER_EMAIL, email);
}

export function getUserEmail(): string | null {
  return localStorage.getItem(STORAGE_KEYS.USER_EMAIL);
}

export function clearUserEmail() {
  localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
}

// ==================== MDK (APENAS MEMÓRIA) ====================

export function saveMDKInMemory(mdk: CryptoKey) {
  mdkInMemory = mdk;
}

export function getMDKFromMemory(): CryptoKey | null {
  return mdkInMemory;
}

export function clearMDKFromMemory() {
  mdkInMemory = null;
}

// ==================== CLEAR ALL ====================

export function clearAllStorage() {
  clearTokens();
  clearDeviceId();
  clearPrivateKey();
  clearUserEmail();
  clearMDKFromMemory();
}

// ==================== CHECK AUTH ====================

export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}

export function hasDeviceSetup(): boolean {
  return (
    getDeviceId() !== null &&
    localStorage.getItem(STORAGE_KEYS.PRIVATE_KEY) !== null
  );
}

export function hasMDK(): boolean {
  return mdkInMemory !== null;
}
