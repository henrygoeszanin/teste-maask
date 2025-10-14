/**
 * Utilitários de criptografia simplificados
 * Usa apenas AES-GCM com criptografyCode do servidor
 */

// ==================== CONVERSÃO DE DADOS ====================

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ==================== GERAÇÃO DE CHAVES ====================

/**
 * Gera chave AES-256 para criptografia de arquivos
 */
export async function generateFileKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Importa criptografyCode (string) como chave AES-GCM
 */
export async function importCriptographyCode(
  criptographyCode: string
): Promise<CryptoKey> {
  // Converte a string para bytes
  const encoder = new TextEncoder();
  const keyMaterial = encoder.encode(criptographyCode);

  // Faz hash SHA-256 para obter 256 bits
  const keyHash = await crypto.subtle.digest("SHA-256", keyMaterial);

  // Importa como chave AES-GCM
  return await crypto.subtle.importKey(
    "raw",
    keyHash,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

// ==================== EXPORTAÇÃO DE CHAVES ====================

/**
 * Exporta chave pública para formato PEM
 */
export async function exportPublicKeyToPEM(
  publicKey: CryptoKey
): Promise<string> {
  const exported = await crypto.subtle.exportKey("spki", publicKey);
  const exportedAsBase64 = arrayBufferToBase64(exported);
  return `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64}\n-----END PUBLIC KEY-----`;
}

/**
 * Exporta chave privada para formato PEM
 */
export async function exportPrivateKeyToPEM(
  privateKey: CryptoKey
): Promise<string> {
  const exported = await crypto.subtle.exportKey("pkcs8", privateKey);
  const exportedAsBase64 = arrayBufferToBase64(exported);
  return `-----BEGIN PRIVATE KEY-----\n${exportedAsBase64}\n-----END PRIVATE KEY-----`;
}

/**
 * Exporta chave simétrica (AES) para base64
 */
export async function exportSymmetricKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64(exported);
}

// ==================== IMPORTAÇÃO DE CHAVES ====================

/**
 * Importa chave simétrica (AES) de base64
 */
export async function importSymmetricKey(base64: string): Promise<CryptoKey> {
  const buffer = base64ToArrayBuffer(base64);

  return await crypto.subtle.importKey(
    "raw",
    buffer,
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// ==================== CRIPTOGRAFIA AES-GCM ====================

/**
 * Criptografa dados usando AES-GCM
 */
export async function encryptWithAES(
  data: ArrayBuffer,
  key: CryptoKey,
  iv?: Uint8Array
): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array; authTag: Uint8Array }> {
  // Gera IV se não fornecido
  const encryptionIv = iv || crypto.getRandomValues(new Uint8Array(12));

  // Cria cópia do IV para compatibilidade de tipos
  const ivCopy = new Uint8Array(encryptionIv);

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: ivCopy,
    },
    key,
    data
  );

  // Para AES-GCM, o auth tag está incluído no ciphertext
  // Retornamos o ciphertext completo e o IV usado
  return {
    ciphertext: encrypted,
    iv: encryptionIv,
    authTag: new Uint8Array(0), // Não usado em AES-GCM separado
  };
}

/**
 * Descriptografa dados usando AES-GCM
 */
export async function decryptWithAES(
  encryptedData: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array
): Promise<ArrayBuffer> {
  // Cria uma cópia do IV para garantir compatibilidade de tipos
  const ivCopy = new Uint8Array(iv);

  return await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ivCopy,
    },
    key,
    encryptedData
  );
}

// ==================== UTILITÁRIOS ====================

/**
 * Calcula SHA-256 de um buffer
 */
export async function sha256(data: ArrayBuffer): Promise<ArrayBuffer> {
  return await crypto.subtle.digest("SHA-256", data);
}

/**
 * Gera IV aleatório (12 bytes para AES-GCM)
 */
export function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12));
}

/**
 * Gera UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}
