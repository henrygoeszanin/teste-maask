# Fluxo Completo da Aplicação - Arquitetura Simplificada

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Fluxo de Autenticação](#fluxo-de-autenticação)
3. [Fluxo de Registro de Dispositivo](#fluxo-de-registro-de-dispositivo)
4. [Fluxo de Upload de Arquivo](#fluxo-de-upload-de-arquivo)
5. [Fluxo de Download de Arquivo](#fluxo-de-download-de-arquivo)
6. [Fluxo de Revogação de Dispositivos](#fluxo-de-revogação-de-dispositivos)

---

## Visão Geral

O sistema implementa **criptografia de arquivos** para upload e download de perfis de navegador. Os dados são criptografados no cliente antes de serem enviados ao servidor. A chave de criptografia é gerada pelo servidor no momento do cadastro do usuário e disponibilizada para qualquer dispositivo autenticado.

### Componentes Principais

```
Cliente (Browser/App)
    ↓
API Backend (Fastify)
    ↓
Banco de Dados (PostgreSQL) - Metadados + chave de criptografia
    ↓
Supabase Storage - Arquivos criptografados
```

### Conceitos de Criptografia

1. **criptografyCode** - Chave de criptografia do usuário

   - Gerada automaticamente pelo servidor no cadastro (string aleatória)
   - Armazenada criptografada no banco de dados
   - Retornada para o cliente após autenticação
   - Usada para criptografar/descriptografar todos os arquivos do usuário

2. **Dispositivos** - Identificadores simples

   - Cada dispositivo tem um `deviceName` único
   - Não há chaves públicas/privadas RSA
   - Controle de acesso baseado em status (active/inactive/revoked)

3. **Arquivos** - Dados criptografados no cliente
   - Cliente usa `criptografyCode` para criptografar arquivos antes do upload
   - Servidor armazena apenas metadados (nome, tamanho, caminho)
   - Cliente usa `criptografyCode` para descriptografar após download

---

## Fluxo de Autenticação

### 1. Registro de Usuário

```javascript
// No Cliente
const response = await fetch("/api/users", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "João Silva",
    email: "joao@email.com",
    password: "Senha123!",
  }),
});

const user = await response.json();
console.log("Usuário cadastrado:", user);
// {
//   id: "01HX...",
//   name: "João Silva",
//   email: "joao@email.com",
//   criptografyCode: "a1b2c3d4e5f6..."  // ⭐ Chave para criptografia
//   createdAt: "2025-10-14T12:00:00Z"
// }

// ⚠️ IMPORTANTE: Armazene a chave localmente
localStorage.setItem("criptografyCode", user.criptografyCode);
```

**Servidor processa:**

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
3. Gera criptografyCode (crypto.randomBytes(32).toString('hex'))
4. Cria entidade User (User.ts)
5. Salva no banco via UserRepository

Response: {
  id: "01HX...",
  name: "João Silva",
  email: "joao@email.com",
  criptografyCode: "a1b2c3d4e5f6...",
  createdAt: "2025-10-14T12:00:00Z"
}
```

**Caminho no código:**

```
user.routes.ts (POST /)
  → validateBody(RegisterSchema)
  → UserController.create()
    → RegisterUseCase.execute()
      → User.create() // Gera criptografyCode automaticamente
      → UserRepository.create()
        → PostgreSQL (users table)
```

---

### 2. Login

```javascript
// No Cliente
const response = await fetch("/api/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: "joao@email.com",
    password: "Senha123!",
  }),
});

const data = await response.json();
console.log("Login realizado:", data);
// {
//   accessToken: "eyJhbGc...",
//   refreshToken: "eyJhbGc...",
//   user: {
//     id: "01HX...",
//     name: "João Silva",
//     email: "joao@email.com",
//     criptografyCode: "a1b2c3d4e5f6..."  // ⭐ Chave para criptografia
//   }
// }

// ⚠️ IMPORTANTE: Armazene os tokens e a chave
localStorage.setItem("accessToken", data.accessToken);
localStorage.setItem("refreshToken", data.refreshToken);
localStorage.setItem("criptografyCode", data.user.criptografyCode);
```

**Servidor processa:**

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
4. Retorna tokens + dados do usuário (incluindo criptografyCode)

Response: {
  accessToken: "eyJhbGc...",
  refreshToken: "eyJhbGc...",
  user: {
    id: "01HX...",
    name: "João Silva",
    email: "joao@email.com",
    criptografyCode: "a1b2c3d4e5f6..."
  }
}
```

**Caminho no código:**

```
auth.routes.ts (POST /login)
  → validateBody(LoginSchema)
  → AuthController.login()
    → LoginUseCase.execute()
      → UserRepository.findByEmail()
      → Argon2.verify()
      → JWT.sign()
      → Retorna user com criptografyCode
```

---

### 3. Recuperar Dados do Usuário

```javascript
// No Cliente - Ao iniciar a aplicação
const accessToken = localStorage.getItem("accessToken");
let criptografyCode = localStorage.getItem("criptografyCode");

if (!criptografyCode) {
  // Se não tem localmente, busca do servidor
  const response = await fetch("/api/users/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const { data } = await response.json();
  criptografyCode = data.criptografyCode;

  // Armazena localmente
  localStorage.setItem("criptografyCode", criptografyCode);
}

console.log("✅ Chave de criptografia carregada");
```

**Servidor processa:**

```
Cliente → API: GET /api/users/me
Headers: {
  "Authorization": "Bearer eyJhbGc..."
}

API processa:
1. Autentica usuário (JWT middleware)
2. Busca dados do usuário no banco
3. Retorna dados incluindo criptografyCode

Response: {
  data: {
    id: "01HX...",
    name: "João Silva",
    email: "joao@email.com",
    criptografyCode: "a1b2c3d4e5f6..."
  }
}
```

**Caminho no código:**

```
user.routes.ts (GET /me)
  → preHandler: authenticate
  → UserController.getMe()
    → UserRepository.findById()
      → PostgreSQL (users table)
```

---

## Fluxo de Registro de Dispositivo

```javascript
// No Cliente

// Gera um nome único para o dispositivo
const deviceName = `${navigator.platform}-${Date.now()}`;
// Exemplo: "Win32-1697289600000"

const response = await fetch("/api/devices", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    deviceName: deviceName,
  }),
});

const device = await response.json();
console.log("✅ Dispositivo registrado:", device);
// {
//   id: "01HX...",
//   deviceName: "Win32-1697289600000",
//   status: "active",
//   createdAt: "2025-10-14T12:00:00Z"
// }

// Armazena deviceName localmente
localStorage.setItem("deviceName", deviceName);
```

**Servidor processa:**

```
Cliente → API: POST /api/devices
Headers: {
  "Authorization": "Bearer eyJhbGc..."
}
Body: {
  "deviceName": "Win32-1697289600000"
}

API processa:
1. Autentica usuário (JWT)
2. Valida dados com Zod
3. Verifica se deviceName já existe
4. Cria entidade Device (status: active)
5. Salva no banco

Response: {
  id: "01HX...",
  deviceName: "Win32-1697289600000",
  status: "active",
  createdAt: "2025-10-14T12:00:00Z"
}
```

**Caminho no código:**

```
device.routes.ts (POST /devices)
  → preHandler: authenticate
  → validateBody(RegisterDeviceSchema)
  → DeviceController.register()
    → RegisterDeviceUseCase.execute()
      → DeviceRepository.findByDeviceName() // Verifica duplicata
      → Device.create()
      → DeviceRepository.create()
        → PostgreSQL (devices table)
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

const { data } = await initResponse.json();
const { uploadId, fileId, presignedUrl, expiresIn } = data;

console.log("✅ Upload iniciado:", { uploadId, fileId });
```

**Servidor processa:**

```
Cliente → API: POST /api/files/upload/init
Headers: {
  "Authorization": "Bearer eyJhbGc..."
}
Body: {
  "fileName": "perfil-chrome.zip",
  "fileSize": 52428800,  // 50MB
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
  data: {
    uploadId: "01HX...",
    fileId: "a1b2c3d4-...",
    presignedUrl: "https://...supabase.co/storage/v1/object/upload/...",
    expiresIn: 3600
  }
}
```

**Caminho no código:**

```
file.routes.ts (POST /files/upload/init)
  → preHandler: authenticate
  → validateBody(InitUploadSchema)
  → FileController.initUpload()
    → InitUploadUseCase.execute()
      → SupabaseStorageService.generateFileKey()
      → SupabaseStorageService.generatePresignedUploadUrl()
```

---

### Fase 2: Criptografar e Enviar Arquivo

```javascript
// No Cliente

// 2. Recupera a chave de criptografia do usuário
const criptografyCode = localStorage.getItem("criptografyCode");

if (!criptografyCode) {
  throw new Error("Chave de criptografia não encontrada");
}

// 3. Converte criptografyCode para chave AES-GCM
const encoder = new TextEncoder();
const keyMaterial = encoder.encode(criptografyCode);

// Hash da chave para obter 256 bits
const keyHash = await crypto.subtle.digest("SHA-256", keyMaterial);

// Importa como chave AES-GCM
const cryptoKey = await crypto.subtle.importKey(
  "raw",
  keyHash,
  { name: "AES-GCM" },
  false,
  ["encrypt"]
);

// 4. Gera IV aleatório para este arquivo
const iv = crypto.getRandomValues(new Uint8Array(12)); // 96 bits para GCM

// 5. Criptografa arquivo
const fileArrayBuffer = await file.arrayBuffer();
const encryptedData = await crypto.subtle.encrypt(
  {
    name: "AES-GCM",
    iv: iv,
  },
  cryptoKey,
  fileArrayBuffer
);

// 6. Combina IV + dados criptografados
// (IV precisa estar junto para descriptografia posterior)
const combined = new Uint8Array(iv.length + encryptedData.byteLength);
combined.set(iv, 0);
combined.set(new Uint8Array(encryptedData), iv.length);

// 7. Upload para Supabase Storage usando presigned URL
const uploadResponse = await fetch(presignedUrl, {
  method: "PUT",
  body: combined,
  headers: {
    "Content-Type": "application/octet-stream",
  },
});

if (!uploadResponse.ok) {
  throw new Error("Upload falhou");
}

console.log("✅ Arquivo criptografado e enviado com sucesso!");
```

---

### Fase 3: Completar Upload

```javascript
// No Cliente (continuação)

// 8. Notifica servidor que upload está completo
const completeResponse = await fetch("/api/files/upload/complete", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    uploadId: uploadId,
    fileId: fileId,
    fileName: file.name,
    fileSize: file.size,
  }),
});

const result = await completeResponse.json();
console.log("✅ Upload completo:", result);
// {
//   message: "Upload completado com sucesso",
//   data: {
//     fileId: "a1b2c3d4-...",
//     fileName: "perfil-chrome.zip",
//     sizeBytes: 52428800,
//     uploadedAt: "2025-10-14T12:05:00Z"
//   }
// }
```

**Servidor processa:**

```
Cliente → API: POST /api/files/upload/complete
Headers: {
  "Authorization": "Bearer eyJhbGc..."
}
Body: {
  "uploadId": "01HX...",
  "fileId": "a1b2c3d4-...",
  "fileName": "perfil-chrome.zip",
  "fileSize": 52428800
}

API processa:
1. Autentica usuário
2. Valida dados com Zod
3. Verifica se arquivo existe no Supabase Storage
4. Cria entidade File (apenas metadados)
5. Salva no banco

Response: {
  message: "Upload completado com sucesso",
  data: {
    fileId: "a1b2c3d4-...",
    fileName: "perfil-chrome.zip",
    sizeBytes: 52428800,
    uploadedAt: "2025-10-14T12:05:00Z"
  }
}
```

**Caminho no código:**

```
file.routes.ts (POST /files/upload/complete)
  → preHandler: authenticate
  → validateBody(CompleteUploadSchema)
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

const { data } = await listResponse.json();
console.log("Arquivos disponíveis:", data.files);
// [
//   {
//     fileId: "a1b2c3d4-...",
//     fileName: "perfil-chrome.zip",
//     sizeBytes: 52428800,
//     createdAt: "2025-10-14T12:05:00Z"
//   }
// ]

// 2. Solicita download de um arquivo específico
const fileId = data.files[0].fileId;
const downloadResponse = await fetch(`/api/files/${fileId}/download`, {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

const downloadData = await downloadResponse.json();
const {
  fileId: downloadFileId,
  fileName,
  presignedUrl,
  expiresIn,
} = downloadData.data;

console.log("✅ URL de download obtida");
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
  data: {
    fileId: "a1b2c3d4-...",
    fileName: "perfil-chrome.zip",
    presignedUrl: "https://...supabase.co/storage/v1/object/sign/...",
    expiresIn: 3600
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

---

### Fase 2: Baixar e Descriptografar

```javascript
// No Cliente (continuação)

// 3. Download do arquivo criptografado do Supabase Storage
const fileResponse = await fetch(presignedUrl);
const encryptedFileBuffer = await fileResponse.arrayBuffer();

console.log("✅ Arquivo criptografado baixado");

// 4. Recupera a chave de criptografia do usuário
const criptografyCode = localStorage.getItem("criptografyCode");

if (!criptografyCode) {
  throw new Error("Chave de criptografia não encontrada");
}

// 5. Converte criptografyCode para chave AES-GCM
const encoder = new TextEncoder();
const keyMaterial = encoder.encode(criptografyCode);

// Hash da chave para obter 256 bits
const keyHash = await crypto.subtle.digest("SHA-256", keyMaterial);

// Importa como chave AES-GCM
const cryptoKey = await crypto.subtle.importKey(
  "raw",
  keyHash,
  { name: "AES-GCM" },
  false,
  ["decrypt"]
);

// 6. Extrai IV (primeiros 12 bytes) e dados criptografados
const combined = new Uint8Array(encryptedFileBuffer);
const iv = combined.slice(0, 12);
const encryptedData = combined.slice(12);

console.log("✅ IV extraído, iniciando descriptografia");

// 7. Descriptografa arquivo
const decryptedBuffer = await crypto.subtle.decrypt(
  {
    name: "AES-GCM",
    iv: iv,
  },
  cryptoKey,
  encryptedData
);

console.log("✅ Arquivo descriptografado");

// 8. Cria blob e faz download
const blob = new Blob([decryptedBuffer], { type: "application/zip" });
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = fileName;
a.click();
URL.revokeObjectURL(url);

console.log("✅ Download completo!");
```

---

## Fluxo de Revogação de Dispositivos

### Cenário: Usuário perde um dispositivo

```javascript
// No Cliente - Dispositivo principal (Laptop)

// 1. Lista todos os dispositivos
const response = await fetch("/api/devices", {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

const { devices } = await response.json();
console.log("Dispositivos:", devices);
// [
//   { id: "1", deviceName: "Win32-1697289600000", status: "active" },
//   { id: "2", deviceName: "iPhone-1697289700000", status: "active" },
// ]

// 2. Usuário identifica dispositivo perdido
const deviceToRevoke = devices.find((d) =>
  d.deviceName.includes("iPhone-1697289700000")
);

// 3. Confirma revogação
const confirmed = confirm(
  `⚠️ ATENÇÃO: Revogar dispositivo ${deviceToRevoke.deviceName}?\n\n` +
    `Este dispositivo será marcado como "revoked" e perderá acesso à API.\n` +
    `Para restaurar o acesso, será necessário fazer login novamente.`
);

if (!confirmed) {
  console.log("❌ Revogação cancelada");
  return;
}

// 4. Revoga o dispositivo
const currentDeviceName = localStorage.getItem("deviceName");

const revokeResponse = await fetch("/api/devices/revoke", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "X-Device-Name": currentDeviceName, // Dispositivo que está revogando
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    deviceName: deviceToRevoke.deviceName,
    password: "Senha123!", // Senha obrigatória
    reason: "lost",
  }),
});

if (revokeResponse.ok) {
  console.log("✅ Dispositivo revogado com sucesso!");
  alert("Dispositivo revogado! Ele não poderá mais fazer login.");
} else {
  const error = await revokeResponse.json();
  console.error("❌ Erro ao revogar:", error);
}
```

**Servidor processa:**

```
Cliente → API: POST /api/devices/revoke
Headers: {
  "Authorization": "Bearer eyJhbGc...",
  "X-Device-Name": "Win32-1697289600000"
}
Body: {
  "deviceName": "iPhone-1697289700000",
  "password": "Senha123!",
  "reason": "lost"
}

API processa:
1. Autentica usuário (JWT)
2. Valida X-Device-Name header
3. Busca dispositivo atual (quem está revogando)
4. Verifica se dispositivo atual está ativo
5. Busca dispositivo alvo (a ser revogado)
6. Valida senha do usuário com Argon2
7. Verifica se não está tentando revogar a si mesmo
8. Marca dispositivo como "revoked"
9. Atualiza no banco

Response: {
  message: "Device revoked successfully",
  data: {
    deviceName: "iPhone-1697289700000",
    revokedAt: "2025-10-14T10:35:00Z"
  }
}
```

**Caminho no código:**

```
device.routes.ts (POST /devices/revoke)
  → preHandler: authenticate
  → validateBody(RevokeDeviceSchema)
  → DeviceRevocationController.revokeDevice()
    → RevokeDeviceUseCase.execute()
      → UserRepository.findById() // Valida senha
      → Argon2.verify()
      → DeviceRepository.findByDeviceName() // Dispositivo atual
      → DeviceRepository.findByDeviceName() // Dispositivo alvo
      → device.revoke() // Marca como revoked
      → DeviceRepository.update()
        → PostgreSQL (devices table)
```

---

### Estado do Banco Após Revogação

**Antes da Revogação:**

```sql
-- Tabela devices
id | user_id | device_name           | status   | created_at          | updated_at
---+---------+-----------------------+----------+---------------------+---------------------
1  | user-1  | Win32-1697289600000   | active   | 2025-10-14 10:00:00 | 2025-10-14 10:00:00
2  | user-1  | iPhone-1697289700000  | active   | 2025-10-14 10:05:00 | 2025-10-14 10:05:00
```

**Depois da Revogação:**

```sql
-- Tabela devices
id | user_id | device_name           | status   | created_at          | updated_at
---+---------+-----------------------+----------+---------------------+---------------------
1  | user-1  | Win32-1697289600000   | active   | 2025-10-14 10:00:00 | 2025-10-14 10:00:00
2  | user-1  | iPhone-1697289700000  | revoked  | 2025-10-14 10:05:00 | 2025-10-14 10:35:00  ← REVOGADO
```

---

### 🛡️ Proteções Implementadas

```
┌─────────────────────────────────────────────────────────────┐
│               PROTEÇÕES DE SEGURANÇA                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1️⃣ Senha Obrigatória                                        │
│    ✅ Argon2 com pepper                                     │
│    ✅ Validação no backend                                  │
│                                                             │
│ 2️⃣ Validação de Status                                      │
│    ✅ Sempre consulta banco de dados                        │
│    ✅ Dispositivo revogado = bloqueado                      │
│                                                             │
│ 3️⃣ Auto-Revogação Bloqueada                                 │
│    ✅ Dispositivo não pode revogar a si mesmo               │
│    ✅ Requer outro dispositivo autorizado                   │
│                                                             │
│ 4️⃣ Validação de Propriedade                                 │
│    ✅ Apenas dono pode revogar dispositivos                 │
│    ✅ Verificação de userId                                 │
│                                                             │
│ 5️⃣ Auditoria                                                │
│    ✅ Registra quem, quando, por quê                        │
│    ✅ Timestamps de revogação                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Casos de Uso

#### Caso 1: Dispositivo Perdido/Roubado

```
Timeline:
10:00 - Usuário perde celular (iPhone)
10:30 - Usuário acessa laptop e revoga iPhone
10:31 - Sistema valida senha ✅
10:32 - iPhone marcado como "revoked" ✅

Resultado:
✅ Laptop: Funcionando normalmente
❌ iPhone: Não pode mais fazer requisições à API
```

#### Caso 2: Troca de Senha Adicional

```
Timeline:
10:00 - Usuário revoga dispositivo
10:05 - Usuário troca senha (RECOMENDADO)
10:06 - Todos os tokens JWT são invalidados

Resultado:
❌ Dispositivo revogado: Sem acesso permanente
❌ Outros dispositivos: Precisam fazer login novamente
✅ Segurança máxima garantida
```

---

## Resumo da Arquitetura

### Vantagens da Arquitetura Simplificada

✅ **Simplicidade**

- Sem necessidade de sincronização complexa de chaves
- Sem envelopes RSA
- Sem master devices

✅ **Multi-dispositivo**

- Qualquer dispositivo autenticado acessa a mesma chave
- Login em novo dispositivo = acesso imediato aos arquivos
- Sem processo de "autorização" entre dispositivos

✅ **Recuperação Fácil**

- Perda de dispositivo não impede acesso aos dados
- Basta fazer login em outro dispositivo

✅ **Segurança Adequada**

- Arquivos criptografados com AES-256-GCM
- Chave armazenada criptografada no banco
- Controle de acesso via JWT e status de dispositivo

### Limitações

⚠️ **Confiança no Servidor**

- O servidor tem acesso à `criptografyCode` (embora criptografada)
- Não é zero-knowledge (servidor pode descriptografar se comprometido)

⚠️ **Revogação não Imediata**

- Dispositivo revogado ainda pode acessar arquivos já baixados
- Apenas bloqueia novas requisições à API

### Recomendações de Segurança

1. **Sempre use HTTPS** - Toda comunicação deve ser criptografada
2. **Rotação de chaves** - Considere permitir que usuário regenere `criptografyCode`
3. **Auditoria** - Registre todos os acessos e ações sensíveis
4. **Rate limiting** - Previna ataques de força bruta
5. **Troca de senha** - Após revogar dispositivo, recomende troca de senha
