# Fluxo Completo da Aplicação - Criptografia E2EE

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Fluxo de Autenticação](#fluxo-de-autenticação)
3. [Fluxo de Registro de Dispositivo](#fluxo-de-registro-de-dispositivo)
4. [Fluxo de Sincronização de MDK](#fluxo-de-sincronização-de-mdk)
5. [Fluxo de Upload de Arquivo](#fluxo-de-upload-de-arquivo)
6. [Fluxo de Download de Arquivo](#fluxo-de-download-de-arquivo)
7. [Fluxo de Adicionar Novo Dispositivo](#fluxo-de-adicionar-novo-dispositivo)
8. [Fluxo de Revogação Segura de Dispositivos](#fluxo-de-revogação-segura-de-dispositivos)
9. [Diagramas de Sequência](#diagramas-de-sequência)

---

## Visão Geral

O sistema implementa **Criptografia Ponta a Ponta (E2EE)** para upload e download de arquivos de perfis de navegador. Os dados são criptografados no cliente antes de serem enviados ao servidor, garantindo que o servidor nunca tenha acesso aos dados em texto plano.

### Componentes Principais

```
Cliente (Browser/App)
    ↓
API Backend (Fastify)
    ↓
Banco de Dados (PostgreSQL) - Apenas metadados
    ↓
Supabase Storage - Arquivos criptografados
```

### Conceitos de Criptografia

1. **MDK (Master Decryption Key)** - Chave mestra AES-256

   - Gerada no primeiro dispositivo do usuário
   - Nunca armazenada no servidor
   - Existe apenas na memória do dispositivo

2. **FEK (File Encryption Key)** - Chave única por arquivo AES-256-GCM

   - Gerada para cada arquivo
   - Criptografada pela MDK antes de ser armazenada

3. **Device Keys** - Par de chaves RSA-4096

   - Chave privada mantida no dispositivo
   - Chave pública armazenada no servidor

4. **Envelope** - MDK criptografada com chave pública do dispositivo
   - Permite múltiplos dispositivos acessarem os mesmos arquivos

---

## Fluxo de Autenticação

### 1. Registro de Usuário

```
Cliente → API: POST /api/users
Body: {
  "name": "João Silva",
  "email": "joao@email.com",
  "password": "Senha123!"
}

API processa:
1. Valida dados com Zod (user.dto.ts)
2. Hash da senha com Argon2 (pepper + salt)
3. Cria entidade User (User.ts)
4. Salva no banco via UserRepository
5. Retorna: { id, name, email, createdAt }
```

**Caminho no código:**

```
user.routes.ts (POST /)
  → validateBody(RegisterSchema)
  → UserController.create()
    → RegisterUseCase.execute()
      → UserRepository.create()
        → PostgreSQL (users table)
```

### 2. Login

```
Cliente → API: POST /api/login
Body: {
  "email": "joao@email.com",
  "password": "Senha123!"
}

API processa:
1. Busca usuário por email
2. Verifica senha com Argon2
3. Gera JWT (accessToken + refreshToken)
4. Retorna tokens

Response: {
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

**Caminho no código:**

```
auth.routes.ts (POST /login)
  → AuthController.login()
    → LoginUseCase.execute()
      → UserRepository.findByEmail()
      → Argon2.verify()
      → JWT.sign()
```

### 3. Autenticação nas Rotas Protegidas

```
Cliente → API: GET /api/users/me
Headers: {
  "Authorization": "Bearer eyJhbGc..."
}

Middleware authenticate:
1. Extrai token do header
2. Verifica assinatura JWT
3. Decodifica payload
4. Adiciona user ao request
5. Continua para o handler
```

**Caminho no código:**

```
Qualquer rota protegida
  → preHandler: authenticate
    → authenticate.ts
      → JWT.verify()
      → request.user = decoded
```

---

## Fluxo de Registro de Dispositivo

### Passo 1: Cliente Gera Par de Chaves

```javascript
// No Cliente (Browser/App)
const { publicKey, privateKey } = await crypto.subtle.generateKey(
  {
    name: "RSA-OAEP",
    modulusLength: 4096,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256",
  },
  true, // extractable
  ["encrypt", "decrypt"]
);

// Exporta chave pública em formato PEM
const publicKeyPem = await exportPublicKeyToPEM(publicKey);

// Calcula fingerprint
const publicKeyBuffer = await crypto.subtle.exportKey("spki", publicKey);
const hashBuffer = await crypto.subtle.digest("SHA-256", publicKeyBuffer);
const keyFingerprint = bufferToHex(hashBuffer);

// Gera deviceId único
const deviceId = crypto.randomUUID();

// IMPORTANTE: privateKey é armazenada apenas no dispositivo
// Pode ser no localStorage, IndexedDB ou Secure Storage
```

### Passo 2: Registra Dispositivo no Servidor

```
Cliente → API: POST /api/devices
Headers: {
  "Authorization": "Bearer eyJhbGc..."
}
Body: {
  "deviceId": "a1b2c3d4-e5f6-...",
  "publicKey": "-----BEGIN PUBLIC KEY-----\nMIICIj...",
  "publicKeyFormat": "PEM",
  "keyFingerprint": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}

API processa:
1. Autentica usuário (JWT)
2. Valida dados com Zod
3. Verifica se deviceId já existe
4. Cria entidade Device
5. Salva no banco
6. Retorna confirmação

Response: {
  "id": "01HX...",
  "deviceId": "a1b2c3d4-e5f6-...",
  "status": "active",
  "createdAt": "2025-10-14T12:00:00Z"
}
```

**Caminho no código:**

```
device.routes.ts (POST /devices)
  → preHandler: authenticate
  → DeviceController.register()
    → RegisterDeviceUseCase.execute()
      → DeviceRepository.findByDeviceId() // Verifica duplicata
      → Device.create()
      → DeviceRepository.create()
        → PostgreSQL (devices table)
```

---

## Fluxo de Sincronização de MDK

### Passo 1: Cliente Gera MDK (Primeira Vez)

```javascript
// No Cliente - Apenas na primeira vez que o usuário usa o sistema

// Verifica se já tem envelope
const response = await fetch("/api/envelopes/me", {
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "X-Device-Id": deviceId,
  },
});

if (response.status === 404) {
  // Primeira vez - gera nova MDK
  const mdk = crypto.getRandomValues(new Uint8Array(32)); // 256 bits

  // Armazena MDK na memória (RAM) - NUNCA em disco
  window.maask = { mdk };

  // Criptografa MDK com chave pública do dispositivo
  const encryptedMdk = await crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    publicKey, // Chave pública do dispositivo atual
    mdk
  );

  const envelopeCiphertext = bufferToBase64(encryptedMdk);

  // Envia envelope para servidor
  await fetch("/api/envelopes", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      deviceId: deviceId,
      envelopeCiphertext: envelopeCiphertext,
      encryptionMetadata: {
        algorithm: "RSA-OAEP",
        hashFunction: "SHA-256",
      },
    }),
  });
}
```

### Passo 2: Servidor Armazena Envelope

```
Cliente → API: POST /api/envelopes
Headers: {
  "Authorization": "Bearer eyJhbGc..."
}
Body: {
  "deviceId": "a1b2c3d4-e5f6-...",
  "envelopeCiphertext": "base64-encrypted-mdk...",
  "encryptionMetadata": {
    "algorithm": "RSA-OAEP",
    "hashFunction": "SHA-256"
  }
}

API processa:
1. Autentica usuário
2. Busca dispositivo no banco
3. Verifica se dispositivo está ativo
4. Verifica se dispositivo pertence ao usuário
5. Cria entidade Envelope
6. Salva no banco

Response: {
  "id": "01HX...",
  "deviceId": "01HY...",
  "createdAt": "2025-10-14T12:00:00Z"
}
```

**Caminho no código:**

```
envelope.routes.ts (POST /envelopes)
  → preHandler: authenticate
  → EnvelopeController.create()
    → CreateEnvelopeUseCase.execute()
      → DeviceRepository.findByDeviceId()
      → device.isActive()
      → Envelope.create()
      → EnvelopeRepository.create()
        → PostgreSQL (envelopes table)
```

### Passo 3: Cliente Recupera MDK (Login Posterior)

```javascript
// No Cliente - Logins subsequentes

// Busca envelope do servidor
const response = await fetch("/api/envelopes/me", {
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "X-Device-Id": deviceId,
  },
});

const { envelopeCiphertext, encryptionMetadata } = await response.json();

// Descriptografa envelope com chave privada
const encryptedMdkBuffer = base64ToBuffer(envelopeCiphertext);
const mdkBuffer = await crypto.subtle.decrypt(
  {
    name: "RSA-OAEP",
  },
  privateKey, // Chave privada armazenada localmente
  encryptedMdkBuffer
);

// MDK agora está disponível na memória
const mdk = new Uint8Array(mdkBuffer);
window.maask = { mdk };
```

**Caminho no código:**

```
envelope.routes.ts (GET /envelopes/me)
  → preHandler: authenticate
  → validateDeviceId middleware (X-Device-Id header)
  → EnvelopeController.getMyEnvelope()
    → GetEnvelopeUseCase.execute()
      → DeviceRepository.findByDeviceId()
      → EnvelopeRepository.findByUserIdAndDeviceId()
        → PostgreSQL (envelopes table)
```

---

## Fluxo de Upload de Arquivo

### Fase 1: Iniciar Upload

```javascript
// No Cliente
const file = document.getElementById("file-input").files[0];

// 1. Solicita URL assinada ao servidor
const initResponse = await fetch("/api/files/upload/init", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  }),
});

const { uploadId, fileId, presignedUrl, expiresIn } = await initResponse.json();
```

**Servidor processa:**

```
Cliente → API: POST /api/files/upload/init
Headers: {
  "Authorization": "Bearer eyJhbGc..."
}
Body: {
  "fileName": "perfil-chrome.zip",
  "fileSize": 52428800, // 50MB
  "mimeType": "application/zip"
}

API processa:
1. Autentica usuário
2. Valida dados (max 500MB)
3. Gera uploadId (ULID)
4. Gera fileId (UUID)
5. Gera caminho no Storage: users/{userId}/files/{fileId}
6. Gera presigned URL (válida por 1 hora)

Response: {
  "uploadId": "01HX...",
  "fileId": "a1b2c3d4-...",
  "presignedUrl": "https://txuiaqcmkhttexzhijmp.supabase.co/storage/v1/object/upload/sign/user-data/...",
  "expiresIn": 3600
}
```

**Caminho no código:**

```
file.routes.ts (POST /files/upload/init)
  → preHandler: authenticate
  → FileController.initUpload()
    → InitUploadUseCase.execute()
      → SupabaseStorageService.generateFileKey()
      → SupabaseStorageService.generatePresignedUploadUrl()
```

### Fase 2: Criptografar e Enviar Arquivo

```javascript
// No Cliente

// 2. Gera FEK (File Encryption Key) única para este arquivo
const fek = crypto.getRandomValues(new Uint8Array(32)); // 256 bits
const iv = crypto.getRandomValues(new Uint8Array(16)); // 128 bits

// 3. Importa FEK para uso
const fekKey = await crypto.subtle.importKey(
  "raw",
  fek,
  { name: "AES-GCM" },
  false,
  ["encrypt"]
);

// 4. Criptografa arquivo em stream
const encryptedChunks = [];
const reader = file.stream().getReader();
const chunkSize = 64 * 1024; // 64KB

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  // Criptografa cada chunk
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    fekKey,
    value
  );

  encryptedChunks.push(new Uint8Array(encrypted));
}

// 5. Combina chunks criptografados
const encryptedFile = concatenateArrayBuffers(encryptedChunks);

// 6. Upload para Supabase Storage usando presigned URL
const uploadResponse = await fetch(presignedUrl, {
  method: "PUT",
  body: encryptedFile,
});

if (!uploadResponse.ok) {
  throw new Error("Upload falhou");
}
```

### Fase 3: Completar Upload

```javascript
// No Cliente (continuação)

// 7. Obtém authTag da criptografia GCM
// (Nota: Web Crypto API não expõe authTag diretamente,
//  então você pode precisar usar uma biblioteca como @noble/ciphers)

// 8. Criptografa FEK com MDK
const mdkKey = await crypto.subtle.importKey(
  "raw",
  window.maask.mdk,
  { name: "AES-GCM" },
  false,
  ["encrypt"]
);

const fekIv = crypto.getRandomValues(new Uint8Array(16));
const encryptedFek = await crypto.subtle.encrypt(
  {
    name: "AES-GCM",
    iv: fekIv,
  },
  mdkKey,
  fek
);

// 9. Notifica servidor que upload está completo
const completeResponse = await fetch("/api/files/upload/complete", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    uploadId: uploadId,
    encryptedFek: bufferToBase64(encryptedFek),
    encryptionMetadata: {
      algorithm: "AES-256-GCM",
      iv: bufferToBase64(iv),
      authTag: bufferToBase64(authTag),
    },
  }),
});

const result = await completeResponse.json();
console.log("Upload completo:", result);
```

**Servidor processa (completeUpload):**

```
Cliente → API: POST /api/files/upload/complete
Headers: {
  "Authorization": "Bearer eyJhbGc..."
}
Body: {
  "uploadId": "01HX...",
  "encryptedFek": "base64-encrypted-fek...",
  "encryptionMetadata": {
    "algorithm": "AES-256-GCM",
    "iv": "base64-iv...",
    "authTag": "base64-auth-tag..."
  }
}

API processa:
1. Autentica usuário
2. Recebe metadados do front-end (fileName, fileSize, fileId)
3. Verifica se arquivo existe no Supabase Storage
4. Cria entidade File
5. Salva metadados no banco

Response: {
  "message": "Upload completado com sucesso",
  "data": {
    "fileId": "a1b2c3d4-...",
    "fileName": "perfil-chrome.zip",
    "sizeBytes": 52428800,
    "uploadedAt": "2025-10-14T12:05:00Z"
  }
}
```

**Caminho no código:**

```
file.routes.ts (POST /files/upload/complete)
  → preHandler: authenticate
  → FileController.completeUpload()
    → CompleteUploadUseCase.execute()
      → SupabaseStorageService.fileExists()
      → File.create()
      → FileRepository.create()
        → PostgreSQL (files table)
```

---

## Fluxo de Download de Arquivo

### Fase 1: Solicitar Download

```javascript
// No Cliente

// 1. Lista arquivos disponíveis
const listResponse = await fetch("/api/files?page=1&limit=20", {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

const { files } = await listResponse.json();
// files = [{ fileId: "...", fileName: "...", sizeBytes: ..., createdAt: "..." }]

// 2. Solicita download de um arquivo específico
const fileId = files[0].fileId;
const downloadResponse = await fetch(`/api/files/${fileId}/download`, {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

const {
  fileId: downloadFileId,
  fileName,
  presignedUrl,
  encryptedFek,
  encryptionMetadata,
  expiresIn,
} = await downloadResponse.json();
```

**Servidor processa:**

```
Cliente → API: GET /api/files/{fileId}/download
Headers: {
  "Authorization": "Bearer eyJhbGc..."
}

API processa:
1. Autentica usuário
2. Busca arquivo no banco por fileId
3. Verifica se arquivo pertence ao usuário
4. Verifica se arquivo existe no Supabase Storage
5. Gera presigned URL para download (1 hora)
6. Retorna metadados + presigned URL

Response: {
  "data": {
    "fileId": "a1b2c3d4-...",
    "fileName": "perfil-chrome.zip",
    "presignedUrl": "https://txuiaqcmkhttexzhijmp.supabase.co/storage/v1/object/sign/user-data/...",
    "encryptedFek": "base64-encrypted-fek...",
    "encryptionMetadata": {
      "algorithm": "AES-256-GCM",
      "iv": "base64-iv...",
      "authTag": "base64-auth-tag..."
    },
    "expiresIn": 3600
  }
}
```

**Caminho no código:**

```
file.routes.ts (GET /files/:fileId/download)
  → preHandler: authenticate
  → FileController.download()
    → DownloadFileUseCase.execute()
      → FileRepository.findByFileId()
      → SupabaseStorageService.fileExists()
      → SupabaseStorageService.generatePresignedDownloadUrl()
```

### Fase 2: Baixar e Descriptografar

```javascript
// No Cliente (continuação)

// 3. Descriptografa FEK usando MDK
const encryptedFekBuffer = base64ToBuffer(encryptedFek);
const fekIvBuffer = base64ToBuffer(encryptionMetadata.iv);

const mdkKey = await crypto.subtle.importKey(
  "raw",
  window.maask.mdk,
  { name: "AES-GCM" },
  false,
  ["decrypt"]
);

const fekBuffer = await crypto.subtle.decrypt(
  {
    name: "AES-GCM",
    iv: fekIvBuffer,
  },
  mdkKey,
  encryptedFekBuffer
);

const fek = new Uint8Array(fekBuffer);

// 4. Download do arquivo criptografado do Supabase Storage
const fileResponse = await fetch(presignedUrl);
const encryptedFileBuffer = await fileResponse.arrayBuffer();

// 5. Descriptografa arquivo com FEK
const fileIv = base64ToBuffer(encryptionMetadata.iv);
const authTag = base64ToBuffer(encryptionMetadata.authTag);

const fekKey = await crypto.subtle.importKey(
  "raw",
  fek,
  { name: "AES-GCM" },
  false,
  ["decrypt"]
);

const decryptedBuffer = await crypto.subtle.decrypt(
  {
    name: "AES-GCM",
    iv: fileIv,
    tagLength: 128, // authTag length
  },
  fekKey,
  encryptedFileBuffer
);

// 6. Cria blob e faz download
const blob = new Blob([decryptedBuffer], { type: "application/zip" });
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = fileName;
a.click();
URL.revokeObjectURL(url);

console.log("Download e descriptografia completos!");
```

---

## Fluxo de Adicionar Novo Dispositivo

### Cenário: Usuário quer acessar arquivos em um novo dispositivo

Este é um dos fluxos mais críticos da aplicação, pois permite que um usuário acesse seus arquivos criptografados de múltiplos dispositivos, mantendo a segurança E2EE.

### O Problema a Resolver

```
Dispositivo 1 (Original)          Servidor          Dispositivo 2 (Novo)
- Tem MDK na memória           - Tem envelope1      - NÃO tem MDK
- Tem privateKey1              - (MDK crypto c/     - Tem privateKey2
- Tem publicKey1                  publicKey1)        - Tem publicKey2
```

**Dispositivo 2 NÃO pode descriptografar o envelope1** porque ele foi criptografado com publicKey1, e apenas privateKey1 pode descriptografá-lo.

### A Solução: Envelope Encryption (Compartilhamento Seguro de Chaves)

A solução é usar **Envelope Encryption** (também conhecido como Key Wrapping), onde:

1. O Dispositivo 1 (que já tem MDK) **cria um novo envelope** para o Dispositivo 2
2. Este novo envelope contém a **MESMA MDK**, mas criptografada com a **publicKey2**
3. O Dispositivo 2 pode então descriptografar seu envelope usando **sua própria privateKey2**

### Diagrama de Sequência Completo

```
Dispositivo 1 (Autorizado)          Servidor          Dispositivo 2 (Novo)
         |                             |                       |
         |                             |<------ 1. Registra dispositivo
         |                             |       (POST /devices)
         |                             |       Body: {
         |                             |         deviceId: "dev-2",
         |                             |         publicKey: "...pub2..."
         |                             |       }
         |                             |                       |
         |<------ 2. Notificação ------| (WebSocket/Polling)   |
         |        "Autorizar Device2?" |                       |
         |                             |                       |
         |-- 3. Usuário Aprova ------->|                       |
         |                             |                       |
         |-- 4. Busca MDK local -------|                       |
         |    (descriptografa          |                       |
         |     envelope1 com           |                       |
         |     privateKey1)            |                       |
         |                             |                       |
         |-- 5. Busca publicKey2 ----->|                       |
         |    GET /devices/dev-2       |                       |
         |                             |                       |
         |<- 6. Retorna publicKey2 ----|                       |
         |    { publicKey: "...pub2"}  |                       |
         |                             |                       |
         |-- 7. Criptografa MDK -------|                       |
         |    com publicKey2           |                       |
         |    (MDK + pub2 = envelope2) |                       |
         |                             |                       |
         |-- 8. Envia envelope2 ------>|                       |
         |    POST /envelopes          |                       |
         |    Body: {                  |                       |
         |      deviceId: "dev-2",     |                       |
         |      envelopeCiphertext     |                       |
         |    }                        |                       |
         |                             |                       |
         |                             |------ 9. Notifica ---->|
         |                             |       "Autorizado!"    |
         |                             |                       |
         |                             |<- 10. Busca envelope --|
         |                             |    GET /envelopes/me   |
         |                             |    X-Device-Id: dev-2  |
         |                             |                       |
         |                             |---- 11. Retorna ------>|
         |                             |      envelope2         |
         |                             |                       |
         |                             |  12. Descriptografa -->|
         |                             |      envelope2 com     |
         |                             |      privateKey2       |
         |                             |      MDK recuperada!   |
         |                             |                       |
         |                             |  Agora Device2 tem     |
         |                             |  acesso à MDK e pode   |
         |                             |  acessar os arquivos!  |
```

### Passo a Passo Detalhado

#### 1️⃣ Dispositivo 2 se Registra no Servidor

```javascript
// No Dispositivo 2 (Novo)

// 1. Gera par de chaves RSA-4096
const { publicKey, privateKey } = await crypto.subtle.generateKey(
  {
    name: "RSA-OAEP",
    modulusLength: 4096,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256",
  },
  true,
  ["encrypt", "decrypt"]
);

// 2. Exporta chave pública em formato PEM
const publicKeyPem = await exportPublicKeyToPEM(publicKey);

// 3. Calcula fingerprint da chave
const publicKeyBuffer = await crypto.subtle.exportKey("spki", publicKey);
const hashBuffer = await crypto.subtle.digest("SHA-256", publicKeyBuffer);
const keyFingerprint = bufferToHex(hashBuffer);

// 4. Gera deviceId único
const deviceId = crypto.randomUUID();

// 5. IMPORTANTE: Salva privateKey apenas no dispositivo
// (localStorage, IndexedDB, ou Secure Storage)
await savePrivateKeyLocally(privateKey, deviceId);

// 6. Registra dispositivo no servidor (envia apenas a pública)
const response = await fetch("/api/devices", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    deviceId: deviceId,
    publicKey: publicKeyPem,
    publicKeyFormat: "PEM",
    keyFingerprint: keyFingerprint,
  }),
});

const device = await response.json();
console.log("Dispositivo registrado:", device);
// { id: "...", deviceId: "...", status: "pending", createdAt: "..." }
```

**Estado no Servidor:**

```sql
-- Tabela devices
id | user_id | device_id | public_key | status   | created_at
---+---------+-----------+------------+----------+------------
1  | user-1  | device-1  | ...pub1... | active   | 2025-01-01
2  | user-1  | device-2  | ...pub2... | pending  | 2025-01-10

-- Tabela envelopes (ainda só tem envelope1)
id | user_id | device_id | envelope_ciphertext
---+---------+-----------+--------------------
1  | user-1  | device-1  | [MDK crypto c/ pub1]
```

---

#### 2️⃣ Dispositivo 2 Aguarda Autorização

```javascript
// No Dispositivo 2 (Novo)

// Aguarda autorização por polling (ou pode usar WebSocket)
async function waitForAuthorization() {
  console.log("Aguardando autorização de outro dispositivo...");

  while (true) {
    try {
      // Tenta buscar envelope
      const response = await fetch("/api/envelopes/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Device-Id": deviceId,
        },
      });

      if (response.ok) {
        const { data } = await response.json();
        console.log("✅ Envelope recebido! Dispositivo autorizado.");
        return data;
      }

      if (response.status === 404) {
        console.log("⏳ Ainda não autorizado. Aguardando...");
      }
    } catch (error) {
      console.error("Erro ao buscar envelope:", error);
    }

    // Aguarda 5 segundos antes de tentar novamente
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

// Inicia o processo de espera
const envelope = await waitForAuthorization();

// Quando envelope for recebido, descriptografa MDK
const encryptedMdkBuffer = base64ToBuffer(envelope.envelopeCiphertext);
const mdkBuffer = await crypto.subtle.decrypt(
  {
    name: "RSA-OAEP",
  },
  privateKey, // Chave privada do Dispositivo 2
  encryptedMdkBuffer
);

const mdk = new Uint8Array(mdkBuffer);
window.maask = { mdk };

console.log("🎉 MDK recuperada! Dispositivo pronto para uso.");
```

---

#### 3️⃣ Dispositivo 1 Autoriza o Novo Dispositivo

```javascript
// No Dispositivo 1 (Autorizador)

// 1. Lista dispositivos pendentes
async function listPendingDevices() {
  const response = await fetch("/api/devices", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const { data } = await response.json();
  return data.devices.filter((d) => d.status === "pending");
}

const pendingDevices = await listPendingDevices();
console.log("Dispositivos pendentes:", pendingDevices);
// [{ id: "...", deviceId: "device-2", status: "pending", createdAt: "..." }]

// 2. Usuário confirma autorização na UI
const pendingDevice = pendingDevices[0];
const userConfirmed = confirm(
  `Autorizar dispositivo ${pendingDevice.deviceId}?\n` +
    `Isso permitirá que este dispositivo acesse seus arquivos criptografados.`
);

if (!userConfirmed) {
  console.log("❌ Autorização cancelada pelo usuário");
  return;
}

// 3. Recupera MDK local (já está na memória)
const mdk = window.maask.mdk; // MDK já descriptografada

// 4. Busca informações do dispositivo a ser autorizado
const deviceResponse = await fetch(`/api/devices/${pendingDevice.id}`, {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

const deviceInfo = await deviceResponse.json();
console.log("Informações do dispositivo:", deviceInfo);

// 5. Importa chave pública do Dispositivo 2
const publicKey2 = await importPublicKeyFromPEM(deviceInfo.data.publicKey);

// 6. Criptografa a MESMA MDK com a chave pública do Dispositivo 2
const encryptedMdkForDevice2 = await crypto.subtle.encrypt(
  {
    name: "RSA-OAEP",
  },
  publicKey2, // Chave pública do Dispositivo 2
  mdk // A MESMA MDK que Dispositivo 1 usa
);

// 7. Cria envelope para o Dispositivo 2
const createEnvelopeResponse = await fetch("/api/envelopes", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    deviceId: pendingDevice.deviceId,
    envelopeCiphertext: bufferToBase64(encryptedMdkForDevice2),
    encryptionMetadata: {
      algorithm: "RSA-OAEP",
      hashFunction: "SHA-256",
    },
  }),
});

if (createEnvelopeResponse.ok) {
  console.log("✅ Dispositivo autorizado com sucesso!");
  alert(
    "Dispositivo autorizado! O outro dispositivo agora pode acessar seus arquivos."
  );
} else {
  console.error("❌ Erro ao autorizar dispositivo");
}
```

**Estado no Servidor:**

```sql
-- Tabela devices (device-2 agora está ativo)
id | user_id | device_id | public_key | status   | created_at
---+---------+-----------+------------+----------+------------
1  | user-1  | device-1  | ...pub1... | active   | 2025-01-01
2  | user-1  | device-2  | ...pub2... | active   | 2025-01-10

-- Tabela envelopes (agora tem 2 envelopes!)
id | user_id | device_id | envelope_ciphertext    | created_at
---+---------+-----------+------------------------+------------
1  | user-1  | device-1  | [MDK crypto c/ pub1]   | 2025-01-01
2  | user-1  | device-2  | [MDK crypto c/ pub2]   | 2025-01-10
```

**Importante:** Ambos os envelopes contêm a **MESMA MDK**, mas criptografada com chaves públicas diferentes!

---

### Diagrama Visual Detalhado

```
┌────────────────────────────────────────────────────────────────┐
│                    ESTADO INICIAL                              │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Dispositivo 1          Servidor              Dispositivo 2    │
│  ┌─────────────┐       ┌──────────┐          ┌─────────────┐   │
│  │ MDK (RAM)   │       │ envelope1│          │ (vazio)     │   │
│  │ privateKey1 │       │ (MDK +   │          │ privateKey2 │   │
│  │ publicKey1  │       │ pubKey1) │          │ publicKey2  │   │
│  └─────────────┘       └──────────┘          └─────────────┘   │
│                                                                │
└────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    PROCESSO DE COMPARTILHAMENTO                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Dispositivo 1:                                                 │
│  1. Tem MDK na memória ✓                                        │
│  2. Busca publicKey2 do servidor ✓                              │
│  3. Criptografa MDK com publicKey2:                             │
│                                                                 │
│     MDK (plain) ──[RSA-OAEP + publicKey2]──> encryptedMDK2      │
│                                                                 │
│  4. Envia envelope2 para servidor ✓                             │
│                                                                 │
│  Servidor:                                                      │
│  - Armazena envelope2 (MDK crypto c/ pub2)                      │
│  - NÃO conhece a MDK em texto plano                             │
│  - Apenas transporta o envelope criptografado                   │
│                                                                 │
│  Dispositivo 2:                                                 │
│  1. Busca envelope2 do servidor ✓                               │
│  2. Descriptografa com privateKey2:                             │
│                                                                 │
│     encryptedMDK2 ──[RSA-OAEP + privateKey2]──> MDK (plain)     │
│                                                                 │
│  3. Armazena MDK na memória ✓                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    ESTADO FINAL                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Dispositivo 1          Servidor              Dispositivo 2     │
│  ┌─────────────┐       ┌──────────┐          ┌─────────────┐    │
│  │ MDK (RAM)   │       │ envelope1│          │ MDK (RAM)   │    │
│  │ privateKey1 │       │ envelope2│          │ privateKey2 │    │
│  │ publicKey1  │       │          │          │ publicKey2  │    │
│  └─────────────┘       └──────────┘          └─────────────┘    │
│                                                                 │
│  ✅ MESMA MDK em ambos os dispositivos!                         |
│  ✅ Cada um descriptografa com sua própria chave privada        │
│  ✅ Servidor nunca viu a MDK em texto plano                     │
│  ✅ Ambos podem acessar os mesmos arquivos                      │ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Pontos-Chave de Segurança

✅ **MDK nunca trafega em texto plano**

- Sempre criptografada com RSA-OAEP antes de ser enviada
- Servidor nunca tem acesso à MDK descriptografada

✅ **Chaves privadas nunca saem dos dispositivos**

- privateKey1 permanece apenas no Dispositivo 1
- privateKey2 permanece apenas no Dispositivo 2
- Cada dispositivo só pode descriptografar seu próprio envelope

✅ **Servidor age como intermediário seguro**

- Armazena envelopes criptografados
- Não pode descriptografar nem acessar a MDK
- Apenas entrega os envelopes aos dispositivos corretos

✅ **Autorização explícita necessária**

- Dispositivo 1 deve **explicitamente** criar envelope para Dispositivo 2
- Dispositivo 2 não pode "roubar" a MDK sozinho
- Usuário controla quais dispositivos têm acesso

✅ **Revogação de dispositivos possível**

- Se Dispositivo 2 for comprometido, pode-se deletar envelope2
- Dispositivo 2 perde acesso imediato aos arquivos
- Dispositivo 1 continua funcionando normalmente
- Outros dispositivos não são afetados

✅ **Modelo de confiança zero-knowledge**

- Servidor não precisa ser confiado com dados sensíveis
- Mesmo que servidor seja comprometido, dados permanecem seguros
- Criptografia ponta a ponta mantida entre dispositivos

---

### Revogação de Dispositivos - Detalhamento Completo

A revogação de dispositivos é um mecanismo crítico de segurança que permite ao usuário remover imediatamente o acesso de um dispositivo comprometido, perdido ou roubado.

#### Como Funciona a Revogação

**Princípio Básico:**

- Cada dispositivo só consegue descriptografar arquivos se tiver acesso à MDK
- A MDK está no envelope criptografado no servidor
- **Deletar o envelope = Dispositivo perde acesso à MDK = Não consegue mais descriptografar arquivos**

#### Passo a Passo da Revogação

```javascript
// No Dispositivo 1 (Autorizador) - Revogando Dispositivo 2

// 1. Lista todos os dispositivos do usuário
async function listAllDevices() {
  const response = await fetch("/api/devices", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const { data } = await response.json();
  return data.devices;
}

const devices = await listAllDevices();
console.log("Dispositivos ativos:", devices);
// [
//   { id: "1", deviceId: "device-1", status: "active", lastSeen: "2025-10-14T10:00:00Z" },
//   { id: "2", deviceId: "device-2", status: "active", lastSeen: "2025-10-13T15:30:00Z" },
//   { id: "3", deviceId: "device-3", status: "active", lastSeen: "2025-10-10T08:20:00Z" }
// ]

// 2. Usuário identifica dispositivo a revogar
const deviceToRevoke = devices.find((d) => d.deviceId === "device-2");

// 3. Confirma revogação
const confirmed = confirm(
  `⚠️ ATENÇÃO: Revogar dispositivo ${deviceToRevoke.deviceId}?\n\n` +
    `Este dispositivo perderá acesso IMEDIATO a todos os arquivos.\n` +
    `Esta ação NÃO pode ser desfeita.\n\n` +
    `Para restaurar o acesso, será necessário autorizar o dispositivo novamente.`
);

if (!confirmed) {
  console.log("❌ Revogação cancelada");
  return;
}

// 4. Revoga o dispositivo
async function revokeDevice(deviceId) {
  // 4.1. Deleta o envelope do dispositivo
  const deleteEnvelopeResponse = await fetch(
    `/api/envelopes/device/${deviceId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!deleteEnvelopeResponse.ok) {
    throw new Error("Erro ao deletar envelope");
  }

  // 4.2. Marca dispositivo como "revoked" no banco
  const revokeDeviceResponse = await fetch(`/api/devices/${deviceId}/revoke`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!revokeDeviceResponse.ok) {
    throw new Error("Erro ao revogar dispositivo");
  }

  console.log("✅ Dispositivo revogado com sucesso!");
  return true;
}

await revokeDevice(deviceToRevoke.deviceId);

alert("Dispositivo revogado! Ele não pode mais acessar seus arquivos.");
```

#### Estado do Banco Após Revogação

**Antes da Revogação:**

```sql
-- Tabela devices
id | user_id | device_id | status   | last_seen           | created_at
---+---------+-----------+----------+---------------------+------------
1  | user-1  | device-1  | active   | 2025-10-14 10:00:00 | 2025-01-01
2  | user-1  | device-2  | active   | 2025-10-13 15:30:00 | 2025-01-10
3  | user-1  | device-3  | active   | 2025-10-10 08:20:00 | 2025-02-01

-- Tabela envelopes
id | user_id | device_id | envelope_ciphertext    | created_at
---+---------+-----------+------------------------+------------
1  | user-1  | device-1  | [MDK crypto c/ pub1]   | 2025-01-01
2  | user-1  | device-2  | [MDK crypto c/ pub2]   | 2025-01-10
3  | user-1  | device-3  | [MDK crypto c/ pub3]   | 2025-02-01
```

**Depois da Revogação (device-2):**

```sql
-- Tabela devices
id | user_id | device_id | status   | last_seen           | revoked_at          | created_at
---+---------+-----------+----------+---------------------+---------------------+------------
1  | user-1  | device-1  | active   | 2025-10-14 10:00:00 | NULL                | 2025-01-01
2  | user-1  | device-2  | revoked  | 2025-10-13 15:30:00 | 2025-10-14 10:05:00 | 2025-01-10  ← REVOGADO
3  | user-1  | device-3  | active   | 2025-10-10 08:20:00 | NULL                | 2025-02-01

-- Tabela envelopes (envelope2 foi DELETADO!)
id | user_id | device_id | envelope_ciphertext    | created_at
---+---------+-----------+------------------------+------------
1  | user-1  | device-1  | [MDK crypto c/ pub1]   | 2025-01-01
3  | user-1  | device-3  | [MDK crypto c/ pub3]   | 2025-02-01
                                                    ← envelope2 REMOVIDO!
```

### O Que Acontece com Device 2 Revogado?

#### ❌ Tentativas Bloqueadas

```javascript
// No Device 2 (Revogado)

// Tentativa 1: Criar novo envelope
const attempt1 = await fetch("/api/envelopes", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({ deviceId: "device-2", envelopeCiphertext: "..." }),
});
// ❌ 403 Forbidden - "Device is not active or has been revoked"

// Tentativa 2: Buscar envelope
const attempt2 = await fetch("/api/envelopes/me", {
  headers: {
    Authorization: `Bearer ${token}`,
    "X-Device-Id": "device-2",
  },
});
// ❌ 404 Not Found - Envelope foi deletado

// Tentativa 3: Fazer upload
const attempt3 = await fetch("/api/files/upload/init", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({ fileName: "test.zip", fileSize: 1000 }),
});
// ❌ 403 Forbidden - "Device is not active"

// Tentativa 4: Revogar outro dispositivo (ATAQUE!)
const attempt4 = await fetch("/api/devices/revoke", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "X-Device-Id": "device-2",
  },
  body: JSON.stringify({
    deviceId: "device-1",
    password: "tentativa",
    reason: "attack",
  }),
});
// ❌ 403 Forbidden - "Current device is not active"
```

### 🛡️ Proteções Implementadas

```
┌─────────────────────────────────────────────────────────────┐
│               7 CAMADAS DE PROTEÇÃO                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1️⃣ Senha Obrigatória                                        │
│    ✅ Argon2 com pepper                                     │
│    ✅ Ladrão não tem senha                                  │
│                                                             │
│ 2️⃣ Validação de Status no Backend                           │
│    ✅ Sempre consulta banco de dados                        │
│    ✅ Dispositivo revogado = bloqueado                      │
│                                                             │
│ 3️⃣ Auto-Revogação Bloqueada                                 │
│    ✅ Dispositivo não pode revogar a si mesmo               │
│    ✅ Requer outro dispositivo autorizado                   │
│                                                             │
│ 4️⃣ Hierarquia de Master Devices                             │
│    ✅ Apenas masters podem revogar outros masters           │
│    ✅ Protege dispositivo principal                         │
│                                                             │
│ 5️⃣ Proteção do Último Master                                │
│    ✅ Não pode revogar último master                        │
│    ✅ Previne lockout da conta                              │
│                                                             │
│ 6️⃣ Transação Atômica                                        │
│    ✅ Deleta envelope + marca como revogado                 │
│    ✅ Tudo ou nada (consistência)                           │
│                                                             │
│ 7️⃣ Auditoria Completa                                       │
│    ✅ Registra quem, quando, por quê                        │
│    ✅ Rastreabilidade total                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Endpoint da API

```
POST /api/devices/revoke

Headers:
  Authorization: Bearer <accessToken>
  X-Device-Id: <current-device-id>
  Content-Type: application/json

Body:
  {
    "deviceId": "550e8400-e29b-41d4-a716-446655440000",
    "password": "SenhaDoUsuario123!",
    "reason": "stolen" | "lost" | "suspicious" | "employee_exit" | "user_initiated"
  }

Responses:
  200 OK:
    {
      "message": "Device revoked successfully",
      "data": {
        "deviceId": "550e8400-e29b-41d4-a716-446655440000",
        "revokedAt": "2025-10-14T12:05:00.000Z"
      }
    }

  400 Bad Request:
    { "error": "Missing X-Device-Id header" }
    { "error": "Cannot revoke your current device" }

  401 Unauthorized:
    { "error": "Invalid password. Revocation denied." }

  403 Forbidden:
    { "error": "Only master devices can revoke other master devices" }
    { "error": "Current device is not active" }

  404 Not Found:
    { "error": "Device to revoke not found" }
```

### Casos de Uso

#### Caso 1: Dispositivo Perdido/Roubado

```
Timeline:
10:00 - Usuário perde celular (Device 2)
10:30 - Usuário acessa laptop (Device 1) e revoga Device 2
10:31 - Sistema valida senha ✅
10:32 - Envelope2 deletado do banco ✅
10:33 - Device 2 marcado como "revoked" ✅
10:34 - Usuário troca senha (invalida tokens JWT) ✅

Resultado:
✅ Device 1 (Laptop): Funcionando normalmente
❌ Device 2 (Celular): Completamente bloqueado
✅ Device 3 (Tablet): Funcionando normalmente
```

#### Caso 2: Funcionário Deixa Empresa

```
Timeline:
09:00 - Funcionário usa laptop corporativo (Device 4)
17:00 - Funcionário é desligado
17:05 - Admin revoga Device 4 (com senha de admin)
17:06 - Admin troca senha do funcionário

Resultado:
❌ Device 4: Sem acesso
✅ Outros dispositivos: Não afetados
```

#### Caso 3: Dispositivo Suspeito

```
Timeline:
14:00 - Usuário vê login suspeito de IP desconhecido
14:01 - Usuário revoga dispositivo suspeito imediatamente
14:02 - Sistema bloqueia dispositivo

Resultado:
❌ Atacante perde acesso imediato
✅ Novos arquivos estão seguros
```
