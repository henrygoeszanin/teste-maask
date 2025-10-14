/**
 * Utilitários de criptografia para E2EE
 * Usa Web Crypto API nativa do navegador
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
 * Gera par de chaves RSA-4096 para o dispositivo
 */
export async function generateDeviceKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  return keyPair;
}

/**
 * Gera MDK (Master Decryption Key) - AES-256
 */
export async function generateMDK(): Promise<CryptoKey> {
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
 * Gera FEK (File Encryption Key) - AES-256
 */
export async function generateFEK(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
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
 * Importa chave pública de formato PEM
 */
export async function importPublicKeyFromPEM(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\s/g, "");

  const binaryDer = base64ToArrayBuffer(pemContents);

  return await crypto.subtle.importKey(
    "spki",
    binaryDer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
}

/**
 * Importa chave privada de formato PEM
 */
export async function importPrivateKeyFromPEM(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  const binaryDer = base64ToArrayBuffer(pemContents);

  return await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"]
  );
}

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

// ==================== CRIPTOGRAFIA RSA ====================

/**
 * Criptografa dados com chave pública RSA (para envelope)
 */
export async function encryptWithPublicKey(
  data: ArrayBuffer,
  publicKey: CryptoKey
): Promise<ArrayBuffer> {
  return await crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    publicKey,
    data
  );
}

/**
 * Descriptografa dados com chave privada RSA (para envelope)
 */
export async function decryptWithPrivateKey(
  encryptedData: ArrayBuffer,
  privateKey: CryptoKey
): Promise<ArrayBuffer> {
  return await crypto.subtle.decrypt(
    {
      name: "RSA-OAEP",
    },
    privateKey,
    encryptedData
  );
}

// ==================== CRIPTOGRAFIA AES-GCM ====================

/**
 * Criptografa dados com AES-GCM
 */
export async function encryptWithAES(
  data: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array
): Promise<{ ciphertext: ArrayBuffer; authTag: Uint8Array }> {
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv as BufferSource,
      tagLength: 128,
    },
    key,
    data
  );

  // Em AES-GCM, os últimos 16 bytes são o authTag
  const ciphertext = encrypted.slice(0, encrypted.byteLength - 16);
  const authTag = new Uint8Array(encrypted.slice(encrypted.byteLength - 16));

  return { ciphertext, authTag };
}

/**
 * Descriptografa dados com AES-GCM
 */
export async function decryptWithAES(
  ciphertext: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array,
  authTag: Uint8Array
): Promise<ArrayBuffer> {
  // Concatena ciphertext + authTag para o decrypt
  const combined = new Uint8Array(ciphertext.byteLength + authTag.byteLength);
  combined.set(new Uint8Array(ciphertext), 0);
  combined.set(authTag, ciphertext.byteLength);

  return await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv as BufferSource,
      tagLength: 128,
    },
    key,
    combined
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
 * Calcula fingerprint de chave pública
 */
export async function calculateKeyFingerprint(
  publicKey: CryptoKey
): Promise<string> {
  const exported = await crypto.subtle.exportKey("spki", publicKey);
  const hash = await sha256(exported);
  return bufferToHex(hash);
}

/**
 * Gera IV aleatório (16 bytes)
 */
export function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Gera UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}
