/**
 * Armazenamento local simplificado para dados sensíveis
 * criptografyCode é mantida em localStorage (criptografada no servidor)
 * Tokens e dados do usuário são persistidos em localStorage
 */

const STORAGE_KEYS = {
  ACCESS_TOKEN: "maask_access_token",
  REFRESH_TOKEN: "maask_refresh_token",
  USER_EMAIL: "maask_user_email",
  CRIPTOGRAPHY_CODE: "maask_criptography_code",
  DEVICE_NAME: "maask_device_name",
} as const;

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

// ==================== CRIPTOGRAPHY CODE ====================
// Chave de criptografia gerada pelo servidor para o usuário
// Usada para criptografar/descriptografar todos os arquivos

export function saveCriptographyCode(criptographyCode: string) {
  localStorage.setItem(STORAGE_KEYS.CRIPTOGRAPHY_CODE, criptographyCode);
  console.log("[Storage] criptografyCode salva");
}

export function getCriptographyCode(): string | null {
  return localStorage.getItem(STORAGE_KEYS.CRIPTOGRAPHY_CODE);
}

export function clearCriptographyCode() {
  localStorage.removeItem(STORAGE_KEYS.CRIPTOGRAPHY_CODE);
  console.log("[Storage] criptografyCode removida");
}

// ==================== DEVICE NAME ====================
// Nome único do dispositivo atual

export function saveDeviceName(deviceName: string) {
  localStorage.setItem(STORAGE_KEYS.DEVICE_NAME, deviceName);
  console.log("[Storage] deviceName salvo:", deviceName);
}

export function getDeviceName(): string | null {
  return localStorage.getItem(STORAGE_KEYS.DEVICE_NAME);
}

export function clearDeviceName() {
  localStorage.removeItem(STORAGE_KEYS.DEVICE_NAME);
  console.log("[Storage] deviceName removido");
}

// ==================== CRIPTOGRAPHY CODE STATUS ====================

export function hasCriptographyCode(): boolean {
  return getCriptographyCode() !== null;
}

// ==================== CLEAR ALL ====================

export function clearAllStorage() {
  clearTokens();
  clearUserEmail();
  clearCriptographyCode();
  clearDeviceName();
}

// ==================== CHECK AUTH ====================

export function isAuthenticated(): boolean {
  return getAccessToken() !== null && hasCriptographyCode();
}
