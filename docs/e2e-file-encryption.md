# Criptografia Ponta a Ponta para Upload de Arquivos

## Objetivo

Implementar um sistema de upload de arquivos de até 500MB com criptografia ponta a ponta (E2EE), permitindo que cada usuário acesse seus dados em múltiplos perfis de navegador através de qualquer dispositivo autorizado, de forma simples e segura.

## Arquitetura de Criptografia

### Conceitos e Componentes

1. **MDK (Master Decryption Key)**

   - Chave mestra para criptografar/descriptografar todos os arquivos de um usuário
   - **Nunca** armazenada em disco no servidor
   - Existe apenas na memória do dispositivo do usuário
   - Gerada uma vez por usuário e sincronizada entre dispositivos via envelope encryption

2. **FEK (File Encryption Key)**

   - Chave única gerada para cada arquivo
   - Usada para criptografar o conteúdo do arquivo com AES-256-GCM
   - Criptografada pela MDK antes de ser armazenada no banco de dados

3. **Device Keys (Par de Chaves Assimétricas)**

   - Cada dispositivo autorizado possui um par de chaves RSA-4096 ou Ed25519
   - Chave privada: mantida apenas no dispositivo (nunca sai dele)
   - Chave pública: armazenada no servidor

4. **Envelope Encryption**
   - MDK é criptografada com a chave pública de cada dispositivo autorizado
   - Permite que múltiplos dispositivos acessem os mesmos dados
   - Cada dispositivo descriptografa seu envelope com sua chave privada para obter a MDK

## Fluxo de Autenticação e Setup Inicial

### 1. Primeiro Acesso (Setup do Dispositivo)

```
Cliente                                Servidor
  |                                       |
  |-- 1. Login (email + password) ------>|
  |<-- 2. JWT Token ----------------------|
  |                                       |
  |-- 3. Gera par de chaves (RSA-4096) --|
  |       - private_key (mantém local)   |
  |       - public_key                   |
  |                                       |
  |-- 4. Registra dispositivo ---------->|
  |       POST /devices                  |
  |       { deviceId, public_key,        |
  |         key_fingerprint }            |
  |                                       |
  |<-- 5. Device registrado --------------|
  |                                       |
  |-- 6. Gera MDK (AES-256) -------------|
  |       (primeira vez do usuário)      |
  |                                       |
  |-- 7. Criptografa MDK ----------------|
  |       encrypted_mdk =                |
  |       encrypt(mdk, public_key)       |
  |                                       |
  |-- 8. Envia envelope --------------->|
  |       POST /envelopes                |
  |       { deviceId, encrypted_mdk,     |
  |         encryption_metadata }        |
  |                                       |
  |<-- 9. Envelope armazenado ------------|
```

### 2. Segundo Dispositivo (Adicionar Novo Dispositivo)

```
Dispositivo 1 (Autorizado)    Servidor    Dispositivo 2 (Novo)
       |                         |                |
       |                         |<-- 1. Solicita autorização --|
       |                         |    (QR Code ou link)         |
       |                         |                |
       |<-- 2. Notificação ------|                |
       |    "Autorizar Device2?" |                |
       |                         |                |
       |-- 3. Aprova ----------->|                |
       |    + Envia MDK          |                |
       |    criptografada com    |                |
       |    public_key_device2   |                |
       |                         |                |
       |                         |-- 4. Novo envelope --------->|
       |                         |                |
```

## Fluxo de Upload de Arquivo

### Sequência Completa

```
Cliente                                          Servidor                    S3/Storage
  |                                                 |                            |
  |-- 1. Inicia upload ---------------------------->|                            |
  |     POST /files/upload/init                    |                            |
  |     { fileName, fileSize, mimeType }           |                            |
  |                                                 |                            |
  |<-- 2. Upload ID + Presigned URL ----------------|                            |
  |     { uploadId, presignedUrl, fileId }         |                            |
  |                                                 |                            |
  |-- 3. Gera FEK (AES-256-GCM) -------------------|                            |
  |     fek = crypto.randomBytes(32)               |                            |
  |     iv = crypto.randomBytes(16)                |                            |
  |                                                 |                            |
  |-- 4. Criptografa arquivo em stream ------------|                            |
  |     (Lê arquivo em chunks de 64KB)             |                            |
  |     Para cada chunk:                           |                            |
  |       - Criptografa com AES-256-GCM (fek, iv)  |                            |
  |       - Envia chunk criptografado --------------|--------------------------->|
  |                                                 |                            |
  |-- 5. Finaliza upload -------------------------->|                            |
  |                                                 |                            |
  |-- 6. Criptografa FEK --------------------------|                            |
  |     encrypted_fek = encrypt(fek, mdk)          |                            |
  |                                                 |                            |
  |-- 7. Envia metadados -------------------------->|                            |
  |     POST /files/upload/complete                |                            |
  |     { uploadId, encrypted_fek,                 |                            |
  |       encryption_metadata: {                   |                            |
  |         algorithm: "AES-256-GCM",              |                            |
  |         iv, authTag                            |                            |
  |       }                                        |                            |
  |     }                                          |                            |
  |                                                 |                            |
  |                                                 |-- 8. Salva metadados ----->|
  |                                                 |     no banco de dados      |
  |                                                 |                            |
  |<-- 9. Upload completo --------------------------|                            |
  |     { fileId, fileName, sizeBytes }            |                            |
```

## Fluxo de Download de Arquivo

```
Cliente                                          Servidor                    S3/Storage
  |                                                 |                            |
  |-- 1. Solicita arquivo ------------------------->|                            |
  |     GET /files/:fileId/download                |                            |
  |                                                 |                            |
  |                                                 |-- 2. Busca metadados ----->|
  |                                                 |     (encrypted_fek, iv,    |
  |                                                 |      authTag, storagePath) |
  |                                                 |                            |
  |<-- 3. Metadados + Presigned URL ----------------|                            |
  |     { presignedUrl, encrypted_fek,             |                            |
  |       encryption_metadata }                    |                            |
  |                                                 |                            |
  |-- 4. Descriptografa FEK -----------------------|                            |
  |     fek = decrypt(encrypted_fek, mdk)          |                            |
  |                                                 |                            |
  |-- 5. Download em stream -------------------------|-------------------------->|
  |     (Recebe chunks criptografados)             |                            |
  |                                                 |                            |
  |-- 6. Descriptografa chunks --------------------|                            |
  |     Para cada chunk:                           |                            |
  |       - Descriptografa com AES-256-GCM         |                            |
  |       - Salva chunk descriptografado           |                            |
  |                                                 |                            |
  |-- 7. Verifica authTag --------------------------|                            |
  |     (Garante integridade do arquivo)           |                            |
  |                                                 |                            |
```

## Implementação Técnica

### Stack Tecnológica

- **Node.js + Fastify**: Backend API
- **Crypto (Node.js)**: Criptografia nativa
- **AWS S3 / MinIO**: Storage de arquivos criptografados
- **Drizzle ORM + PostgreSQL**: Metadados e relacionamentos
- **Stream API**: Upload/download por chunks

### Estrutura de Dados

#### Tabela: `devices`

```typescript
{
  id: string (ULID)
  userId: string (FK -> users.id)
  deviceId: string (UUID gerado no cliente)
  publicKey: string (RSA-4096 public key em PEM)
  publicKeyFormat: string ("PEM", "SPKI")
  keyFingerprint: string (SHA-256 da public key)
  status: enum ("active", "inactive")
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### Tabela: `envelopes`

```typescript
{
  id: string (ULID)
  userId: string (FK -> users.id)
  deviceId: string (FK -> devices.id)
  envelopeCiphertext: string (MDK criptografada)
  encryptionMetadata: jsonb {
    algorithm: "RSA-OAEP",
    hashFunction: "SHA-256"
  }
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### Tabela: `files`

```typescript
{
  id: string (ULID)
  userId: string (FK -> users.id)
  fileId: string (UUID único do arquivo)
  fileName: string
  sizeBytes: integer
  storagePath: string (caminho no S3)
  encryptedFek: string (FEK criptografada pela MDK)
  encryptionMetadata: jsonb {
    algorithm: "AES-256-GCM",
    iv: string (base64),
    authTag: string (base64)
  }
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Endpoints da API

#### 1. Registrar Dispositivo

```
POST /api/devices
Authorization: Bearer <JWT>

Request:
{
  "deviceId": "uuid-v4",
  "publicKey": "-----BEGIN PUBLIC KEY-----...",
  "publicKeyFormat": "PEM",
  "keyFingerprint": "sha256-hash"
}

Response:
{
  "id": "01HX...",
  "deviceId": "uuid-v4",
  "status": "active"
}
```

#### 2. Criar Envelope (Sincronizar MDK)

```
POST /api/envelopes
Authorization: Bearer <JWT>

Request:
{
  "deviceId": "device-id",
  "envelopeCiphertext": "base64-encrypted-mdk",
  "encryptionMetadata": {
    "algorithm": "RSA-OAEP",
    "hashFunction": "SHA-256"
  }
}

Response:
{
  "id": "01HX...",
  "deviceId": "device-id"
}
```

#### 3. Iniciar Upload

```
POST /api/files/upload/init
Authorization: Bearer <JWT>

Request:
{
  "fileName": "profile.zip",
  "fileSize": 524288000,
  "mimeType": "application/zip"
}

Response:
{
  "uploadId": "01HX...",
  "fileId": "uuid-v4",
  "presignedUrl": "https://s3.../upload-url",
  "expiresIn": 3600
}
```

#### 4. Completar Upload

```
POST /api/files/upload/complete
Authorization: Bearer <JWT>

Request:
{
  "uploadId": "01HX...",
  "encryptedFek": "base64-encrypted-fek",
  "encryptionMetadata": {
    "algorithm": "AES-256-GCM",
    "iv": "base64-iv",
    "authTag": "base64-auth-tag"
  }
}

Response:
{
  "fileId": "uuid-v4",
  "fileName": "profile.zip",
  "sizeBytes": 524288000,
  "uploadedAt": "2025-10-14T12:00:00Z"
}
```

#### 5. Download de Arquivo

```
GET /api/files/:fileId/download
Authorization: Bearer <JWT>

Response:
{
  "fileId": "uuid-v4",
  "fileName": "profile.zip",
  "presignedUrl": "https://s3.../download-url",
  "encryptedFek": "base64-encrypted-fek",
  "encryptionMetadata": {
    "algorithm": "AES-256-GCM",
    "iv": "base64-iv",
    "authTag": "base64-auth-tag"
  },
  "expiresIn": 3600
}
```

#### 6. Listar Arquivos do Usuário

```
GET /api/files
Authorization: Bearer <JWT>

Query Params:
- page: number (default: 1)
- limit: number (default: 20)

Response:
{
  "files": [
    {
      "fileId": "uuid-v4",
      "fileName": "profile.zip",
      "sizeBytes": 524288000,
      "createdAt": "2025-10-14T12:00:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

#### 7. Obter Envelope do Dispositivo Atual

```
GET /api/envelopes/me
Authorization: Bearer <JWT>
X-Device-Id: <device-id>

Response:
{
  "id": "01HX...",
  "envelopeCiphertext": "base64-encrypted-mdk",
  "encryptionMetadata": {
    "algorithm": "RSA-OAEP",
    "hashFunction": "SHA-256"
  }
}
```

## Implementação por Stream

### Upload Stream (Cliente -> S3)

```typescript
// Cliente (Browser/Node.js)
async function uploadFileWithEncryption(file: File, mdk: Buffer) {
  // 1. Gerar FEK e IV
  const fek = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);

  // 2. Iniciar upload
  const { uploadId, presignedUrl } = await fetch("/api/files/upload/init", {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    }),
  }).then((r) => r.json());

  // 3. Criar cipher stream
  const cipher = crypto.createCipheriv("aes-256-gcm", fek, iv);

  // 4. Upload por chunks
  const chunkSize = 64 * 1024; // 64KB
  const stream = file.stream();
  const reader = stream.getReader();

  const uploadStream = new WritableStream({
    async write(chunk) {
      const encrypted = cipher.update(chunk);
      await uploadToS3(presignedUrl, encrypted);
    },
    async close() {
      const final = cipher.final();
      await uploadToS3(presignedUrl, final);

      // 5. Obter authTag
      const authTag = cipher.getAuthTag();

      // 6. Criptografar FEK com MDK
      const encryptedFek = encryptWithMDK(fek, mdk);

      // 7. Completar upload
      await fetch("/api/files/upload/complete", {
        method: "POST",
        body: JSON.stringify({
          uploadId,
          encryptedFek: encryptedFek.toString("base64"),
          encryptionMetadata: {
            algorithm: "AES-256-GCM",
            iv: iv.toString("base64"),
            authTag: authTag.toString("base64"),
          },
        }),
      });
    },
  });

  await stream.pipeTo(uploadStream);
}
```

### Download Stream (S3 -> Cliente)

```typescript
// Cliente (Browser/Node.js)
async function downloadFileWithDecryption(fileId: string, mdk: Buffer) {
  // 1. Obter metadados
  const { presignedUrl, encryptedFek, encryptionMetadata } = await fetch(
    `/api/files/${fileId}/download`
  ).then((r) => r.json());

  // 2. Descriptografar FEK
  const fek = decryptWithMDK(Buffer.from(encryptedFek, "base64"), mdk);

  const iv = Buffer.from(encryptionMetadata.iv, "base64");
  const authTag = Buffer.from(encryptionMetadata.authTag, "base64");

  // 3. Criar decipher stream
  const decipher = crypto.createDecipheriv("aes-256-gcm", fek, iv);
  decipher.setAuthTag(authTag);

  // 4. Download e descriptografia por stream
  const response = await fetch(presignedUrl);
  const reader = response.body.getReader();

  const decryptStream = new ReadableStream({
    async start(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.enqueue(decipher.final());
          controller.close();
          break;
        }
        const decrypted = decipher.update(value);
        controller.enqueue(decrypted);
      }
    },
  });

  return decryptStream;
}
```

## Segurança e Boas Práticas

### 1. Nunca Armazene Dados Sensíveis em Texto Plano

- MDK: apenas na memória do dispositivo
- FEK: sempre criptografada pela MDK
- Chaves privadas: apenas no dispositivo (nunca no servidor)

### 2. Criptografia em Repouso e em Trânsito

- **Em Trânsito**: HTTPS/TLS 1.3 obrigatório
- **Em Repouso**: AES-256-GCM para arquivos, RSA-OAEP para envelopes

### 3. Autenticação e Autorização

- JWT com expiração curta (15min)
- Refresh tokens para renovação
- Validação de deviceId em todas as operações sensíveis

### 4. Presigned URLs

- Tempo de expiração curto (1 hora)
- URL única por operação
- Validação de usuário antes de gerar URL

### 5. Rate Limiting

- Upload: 5 arquivos/minuto por usuário
- Download: 20 arquivos/minuto por usuário
- API geral: 100 req/minuto por IP

### 6. Validação de Integridade

- AuthTag do AES-GCM valida integridade do arquivo
- Hash SHA-256 do arquivo pode ser armazenado para verificação adicional

### 7. Auditoria

- Log de todas as operações de upload/download
- Log de criação/revogação de dispositivos
- Monitoramento de tentativas de acesso não autorizado

## Considerações de Performance

### Upload de Arquivos Grandes (até 500MB)

1. **Multipart Upload**

   - Dividir arquivos grandes em partes de 5-10MB
   - Upload paralelo de múltiplas partes
   - Retry automático em caso de falha de uma parte

2. **Compressão**

   - Arquivos de perfil (Default) são compactados antes da criptografia
   - Usar gzip ou zstd para melhor taxa de compressão

3. **Chunks de Criptografia**

   - Criptografar em chunks de 64KB
   - Evita carregar arquivo completo na memória
   - Permite progresso em tempo real

4. **CDN e Edge Locations**
   - Usar S3 com CloudFront ou similar
   - Upload/download mais rápido geograficamente

### Otimizações no Servidor

1. **Stream Processing**

   - Evitar buffering completo do arquivo
   - Processar dados conforme chegam
   - Liberar memória imediatamente após processar chunk

2. **Caching**

   - Cache de metadados de arquivos (Redis)
   - Cache de envelopes do dispositivo atual
   - TTL curto para dados sensíveis

3. **Índices de Banco**
   - Índice em `files.userId` + `files.createdAt`
   - Índice em `envelopes.userId` + `envelopes.deviceId`
   - Índice em `devices.userId` + `devices.status`

## Fluxo de Revogação de Dispositivo

```
Cliente 1 (Autorizado)              Servidor
       |                               |
       |-- 1. Revoga Device2 --------->|
       |     DELETE /devices/:deviceId |
       |                               |
       |                               |-- 2. Marca device como "inactive"
       |                               |-- 3. Remove envelopes associados
       |                               |
       |<-- 4. Dispositivo revogado ----|
```

**Importante**: Arquivos continuam acessíveis pelos dispositivos ativos, pois a MDK ainda existe nos envelopes dos outros dispositivos.

## Próximos Passos

1. **Implementar entidades do domínio**: Device, Envelope, File
2. **Criar repositories**: DeviceRepository, EnvelopeRepository, FileRepository
3. **Implementar use cases**:
   - RegisterDeviceUseCase
   - CreateEnvelopeUseCase
   - InitUploadUseCase
   - CompleteUploadUseCase
   - DownloadFileUseCase
4. **Criar controllers e rotas**: DeviceController, FileController
5. **Integração com S3**: S3Service para presigned URLs
6. **Testes**: Unitários e de integração para cada camada

## Referências

- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [AWS S3 Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
- [Node.js Crypto Module](https://nodejs.org/api/crypto.html)
- [AES-GCM Mode](https://en.wikipedia.org/wiki/Galois/Counter_Mode)
- [Envelope Encryption](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#enveloping)
