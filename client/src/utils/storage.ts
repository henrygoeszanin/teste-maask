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

/**
 * Gera ou recupera um nome de dispositivo consistente baseado em características do navegador
 * Isso garante que o mesmo navegador seja identificado como o mesmo dispositivo
 */
export function getOrCreateDeviceName(): string {
  // Verifica se já existe um deviceName salvo
  const existingDeviceName = getDeviceName();
  if (existingDeviceName) {
    return existingDeviceName;
  }

  // Gera fingerprint baseado em características do navegador
  const fingerprint = generateDeviceFingerprint();

  // Cria um nome amigável baseado no fingerprint
  const deviceName = `Web-${fingerprint.substring(0, 8)}`;

  // Salva para persistência
  saveDeviceName(deviceName);

  console.log("[Storage] Novo deviceName gerado:", deviceName);
  return deviceName;
}

/**
 * Gera um fingerprint único baseado em características do navegador
 * Isso cria um identificador consistente para o mesmo dispositivo/navegador
 */
function generateDeviceFingerprint(): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx?.fillText("fingerprint", 10, 10);

  const data = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    canvasFingerprint: canvas.toDataURL(),
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
  };

  // Converte para string e gera hash
  const dataString = JSON.stringify(data);
  return simpleHash(dataString);
}

/**
 * Hash simples para gerar identificador consistente
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Converte para 32-bit
  }
  return Math.abs(hash).toString(16);
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
