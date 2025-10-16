# Objetivos do Desafio e Implementação - Maask

## 📋 Contexto do Desafio

O Launcher da Maask precisa abrir/fechar perfis de navegador de forma segura e rápida. O perfil do navegador contém dados altamente sensíveis (cookies, histórico, senhas, extensões) que devem ser protegidos com o máximo nível de segurança.

---

## 🎯 Objetivos Obrigatórios do Desafio

### 1. ✅ Upload de Pasta de Perfil (Autenticado e Seguro)

**Requisito:**

- Salvar pasta de perfil (50-500 MB) de forma autenticada
- Priorizar streams para evitar travamentos
- Tratamento seguro de dados sensíveis

**Implementação:**

- ✅ Upload em **2 etapas com Presigned URLs**
- ✅ **Etapa 1**: `POST /api/v1/files/upload/init` → Gera URL pré-assinada (válida 2h)
- ✅ **Etapa 2**: Cliente faz upload direto ao Supabase Storage (não passa pelo backend)
- ✅ **Etapa 3**: `POST /api/v1/files/upload/complete` → Confirma e salva metadados
- ✅ Autenticação via JWT (Access Token + Refresh Token) -> Stateless
- ✅ Validação de Device ID para controle de acesso
- ✅ Backend nunca processa buffers grandes (apenas gera URLs)

**Localização no Código:**

- `server/src/application/usecases/InitUploadUseCase.ts`
- `server/src/application/usecases/CompleteUploadUseCase.ts`
- `server/src/infrastructure/external/SupabaseStorageService.ts`
- `server/src/presentation/routes/fileRoutes.ts`

---

### 2. ✅ Download de Pasta de Perfil

**Requisito:**

- Baixar/restaurar pasta de forma autenticada
- Tempo de resposta adequado (usuário não pode esperar)
- Performance otimizada

**Implementação:**

- ✅ `GET /api/v1/files/:fileId/download` → Gera URL pré-assinada (válida 1h)
- ✅ Cliente faz download direto do Supabase Storage
- ✅ Validação de propriedade (usuário só baixa seus arquivos)
- ✅ Validação de existência no storage antes de gerar URL
- ✅ Tempo de resposta da API: ~80ms (apenas geração de URL)

**Localização no Código:**

- `server/src/application/usecases/DownloadFileUseCase.ts`
- `server/src/infrastructure/external/SupabaseStorageService.ts`
- `server/src/presentation/routes/fileRoutes.ts`

---

### 3. ✅ Consulta de Metadados

**Requisito:**

- Nome do arquivo
- Data de criação
- Data de última modificação
- Tamanho
- Outros metadados relevantes que forem necessários

**Implementação:**

- ✅ `GET /api/v1/files` → Lista todos os arquivos do usuário
- ✅ `GET /api/v1/files/:fileId` → Detalhes de um arquivo específico
- ✅ Metadados retornados:
  - `fileId` (UUID único)
  - `fileName` (nome do arquivo)
  - `sizeBytes` (tamanho em bytes)
  - `createdAt` (data de criação)
  - `updatedAt` (data de última modificação)
  - `storagePath` (caminho no storage, apenas interno)

**Localização no Código:**

- `server/src/application/usecases/ListFilesUseCase.ts`
- `server/src/infrastructure/repositories/FileRepository.ts`
- `server/src/domain/entities/Files.ts`

---

### 4. ✅ Tratamento de Dados Sensíveis

**Requisito:**

- Criptografia em repouso
- Criptografia em trânsito
- Autenticação robusta
- URLs assinadas

**Implementação:**

#### Criptografia em Repouso

- ✅ **Senhas**: Argon2id com pepper e salt
  - Arquivo: `server/src/infrastructure/repositories/UserRepository.ts`
  - Parâmetros: `memoryCost: 15360 KB, timeCost: 2, parallelism: 1`
- ✅ **Arquivos**: AES-256 no Supabase Storage (padrão)

#### Criptografia em Trânsito

- ✅ **HTTPS**: Obrigatório em produção (Nginx + TLS)
- ✅ **Presigned URLs**: Temporárias com expiração automática
  - Upload: 2 horas
  - Download: 1 hora
- ✅ **JWT**: Para autenticação de todas as requisições

#### Autenticação

- ✅ **Dual Token Strategy**:
  - Access Token: 15 minutos
  - Refresh Token: 30 dias com rotação
- ✅ **Device ID**: Controle de dispositivos autorizados (em sistemas instalados localmente no SO talvez pegar o mac address ou outro identificador único)
- ✅ Middleware de autenticação em todas as rotas protegidas

**Localização no Código:**

- `server/src/presentation/middlewares/authenticate.ts`
- `server/src/presentation/middlewares/validateDeviceId.ts`
- `server/src/infrastructure/repositories/UserRepository.ts`
- `server/src/application/usecases/loginUseCase.ts`
- `server/src/application/usecases/RefreshTokenUseCase.ts`

---

### 5. ✅ Tempo de Resposta Adequado (Performance)

**Requisito:**

- Usuário não pode esperar muito tempo
- Performance otimizada para arquivos de 50-500 MB

**Implementação:**

- ✅ **Presigned URLs**: Upload/download direto ao storage (backend não processa arquivos)
- ✅ **Índices no PostgreSQL**: Queries otimizadas com `O(log n)` gerados automaticamente pelo POstgreSQL para primary keys ou unique constraints
- ✅ **Fastify**: Framework 2-3x mais rápido que Express
- ✅ **Drizzle ORM**: Prepared statements gerenciados pelo ORM
- ✅ **Rate Limiting**: Protege contra abusos sem impactar usuários legítimos

**Localização no Código:**

- `server/src/infrastructure/databases/schema.ts` (índices)
- `server/src/presentation/middlewares/rateLimiters.ts`
- `server/src/infrastructure/external/SupabaseStorageService.ts`

---

### 6. ✅ Documentação das Rotas

**Requisito:**

- Documentação em OpenAPI ou Markdown

**Implementação:**

- ✅ **Swagger UI** disponível em `/docs`
- ✅ **Documentação em codigo**:
  - Uso de json doc na maioria das rotas e funções principais
  - Comentários explicativos em codigo
- ✅ **OpenAPI 3.0** com todos os endpoints documentados
- ✅ Exemplos de request/response para cada rota
- ✅ Schemas Zod convertidos automaticamente para OpenAPI
- ✅ Interface interativa para testar endpoints
- ✅ **Documentação Markdown** :
  - `drizzle-migrations.md`
  - `fluxo-simplificado.md`
  - `OBJETIVOS_E_IMPLEMENTACAO.md`
  - `README.md`

**Acesso:**

- Swagger UI: http://localhost:3000/docs
- Documentos Markdown: Raiz do projeto e pasta ./server/docs

**Localização no Código:**

- `server/src/main.ts` (configuração Swagger)
- Arquivos `.md` na raiz e pasta ./server/docs

---

### 7. ✅ Instruções para Rodar e Testar

**Requisito:**

- Instruções claras para setup local

**Implementação:**

- ✅ **Docker Compose**: Setup completo em 1 comando
- ✅ **README.md** com instruções passo a passo
- ✅ Scripts de desenvolvimento configurados
- ✅ Variáveis de ambiente documentadas (`.env.example`)
- ✅ Migrations automáticas do banco de dados

## 🎁 Features Extras Implementadas

### 1. ✅ Sistema de Dispositivos Autorizados

**Por quê:**

- Perfis de navegador são mais sensíveis que senhas
- Necessário controle granular de acesso

**Implementação:**

- ✅ `POST /api/v1/devices` → Registra novo dispositivo
- ✅ `GET /api/v1/devices` → Lista dispositivos do usuário
- ✅ `POST /api/v1/devices/:id/revoke` → Revoga dispositivo remotamente
- ✅ Middleware `validateDeviceId` em rotas sensíveis
- ✅ Header `x-device-id` obrigatório em uploads/downloads

**Benefício:**

- Usuário perdeu notebook → Revoga dispositivo → Dados protegidos instantaneamente

**Melhorias Que podem ser analizadas:**

- Notificações por email/SMS ao registrar novo dispositivo
- Registro de novo dispositivo no login, usando identificadior único (mac address ou similar)

# Melhoria de identificaão de devices - Device attestation — identidade baseada em chave (TPM + fallback DPAPI)

Resumo: no primeiro run o cliente gera um par de chaves ECDSA/Ed25519 não-exportable no TPM (ou, se não houver TPM, protege a chave com DPAPI e Windows Certificate Store). O cliente prova posse assinando um nonce enviado pelo servidor; o servidor armazena o publicKey (ou apenas seu fingerprint) e grava deviceId = SHA256(publicKey). Para operações sensíveis (ex.: geração de presigned URLs) o servidor exige prova de posse (challenge-response) ou mTLS. Revogação é feita removendo o publicKey/certificate e notificando via Socket.IO.

## Fluxo resumido

1. First-run: gerar chave no TPM/CNG (non-exportable).
2. Registro: servidor fornece nonce → cliente assina → cliente envia publicKey + signature → servidor verifica e registra fingerprint (deviceId). Exigir senha/2FA no registro.
3. Uso: antes de operações sensíveis servidor envia nonce → cliente assina → servidor valida com publicKey.
4. Revogação: servidor marca device como revoked, notifica via Socket.IO e invalida provas futuras.

## Fallback Windows

- Sem TPM: gerar chave local e proteger com DPAPI; armazenar no Windows Certificate Store.
- Exigir autenticação local (Windows Hello / PIN) para liberar o uso da chave em operações críticas.
- Marcar dispositivos sem suporte hardware como "reduced trust" e aplicar controles adicionais (ex.: 2FA para downloads).

## Headers e preimage recomendados

- x-device-id: <deviceId = SHA256(publicKey)>
- x-device-ts: <ISO timestamp>
- x-device-signature: <base64(signature(method+"\n"+path+"\n"+timestamp))>
- Preimage consistente: `${method}\n${path}\n${timestamp}`
- TTL do timestamp: 30–120s (recomendar 60s). Rejeitar fora do intervalo para prevenir replay.

## Device ID

- deviceId = SHA256(publicKeyPem) — armazenar apenas fingerprint no banco, nunca o private key.

**Localização:**

- `server/src/application/usecases/RegisterDeviceUseCase.ts`
- `server/src/application/usecases/RevokeDeviceUseCase.ts`
- `server/src/presentation/middlewares/validateDeviceId.ts`

---

### 2. ✅ Comunicação em Tempo Real (Socket.IO)

**Por quê:**

- Revogação de dispositivo deve ser instantânea
- Polling HTTP seria ineficiente

**Implementação:**

- ✅ WebSocket com autenticação JWT
- ✅ Evento `device-revoked` enviado em tempo real
- ✅ Cliente recebe notificação e faz logout automático
- ✅ Logout aproximadamente em 1 segundo (vs. polling a cada 30s)

**Benefício:**

- Segurança instantânea ao revogar dispositivo comprometido

**Localização:**

- `server/src/presentation/gateways/SocketGateway.ts`
- `server/src/application/usecases/RevokeDeviceUseCase.ts`

---

### 3. ✅ Refresh Token com Rotação

**Por quê:**

- Access tokens longos são inseguros
- Usuário não deve fazer login a cada 15 minutos

**Implementação:**

- ✅ Access Token: 15 minutos
- ✅ Refresh Token: 30 dias
- ✅ Rotação automática (token antigo invalidado ao renovar)
- ✅ `POST /api/v1/auth/refresh` para renovação

**Benefício:**

- Segurança sem comprometer experiência do usuário

**Localização:**

- `server/src/application/usecases/RefreshTokenUseCase.ts`

---

### 4. ✅ Rate Limiting Inteligente

**Por quê:**

- Prevenir brute force em login
- Proteger contra abuso de uploads

**Implementação:**

- ✅ Auth routes: 5 tentativas / 15 min (por IP + email)
- ✅ Global: 100 requisições / 15 min
- ✅ Upload: 10 uploads / hora
- ✅ Headers informativos (`x-ratelimit-*`)

**Benefício:**

- Proteção contra ataques sem impactar usuários legítimos
- Controle de recursos do servidor

**Localização:**

- `server/src/presentation/middlewares/rateLimiters.ts`

---

### 5. ✅ Docker Compose para Setup Simplificado

**Por quê:**

- Facilita testes e avaliação
- Ambiente consistente

**Implementação:**

- ✅ Setup completo em < 5 minutos
- ✅ Volumes para persistência de dados
- ✅ Nginx para servir frontend

**Comando:**

```bash
docker-compose up -d
```

**Localização:**

- `docker-compose.yml`

---

## 🏗️ Arquitetura da Solução

**Melhorias:**

- Na aplicação final files seriam os perfis de navegador completos, aqui são apenas arquivos genéricos para simplificar o teste.

### Clean Architecture + DDD

```
src/
├── domain/              # Entidades de negócio puras
│   ├── entities/        # User, File, Device
│   └── errors/          # AppError customizado
│
├── application/         # Casos de uso e DTOs
│   ├── usecases/        # Lógica de aplicação (26 casos de uso)
│   ├── dtos/            # Schemas Zod para validação
│   └── interfaces/      # Contratos de repositórios
│
├── infrastructure/      # Implementações técnicas
│   ├── databases/       # Drizzle ORM + PostgreSQL
│   ├── repositories/    # Implementação dos repositórios
│   └── external/        # Supabase Storage
│
└── presentation/        # Camada HTTP
    ├── controllers/     # Controladores Fastify
    ├── routes/          # Definição de rotas
    ├── middlewares/     # Autenticação, validação, rate limit
    └── gateways/        # Socket.IO
```

---

## 📊 Stack Tecnológica

### Backend

- **Framework**: Fastify (alta performance)
- **Linguagem**: TypeScript (strict mode)
- **Banco de Dados**: PostgreSQL
- **ORM**: Drizzle ORM
- **Storage**: Supabase Storage (S3-compatible)
- **Auth**: JWT + Argon2
- **Real-time**: Socket.IO
- **Docs**: Swagger UI
- **Validação**: Zod

### Frontend

- **Framework**: React 18
- **Build**: Vite
- **Linguagem**: TypeScript
- **HTTP**: Axios
- **WebSocket**: Socket.IO Client

### DevOps

- **Containers**: Docker + Docker Compose
- **Web Server**: Nginx

---

## 📝 Decisões Técnicas Principais

### 1. Por que Presigned URLs?

**Alternativas consideradas:**

- ❌ Upload via backend (multipart)
- ❌ Stream através do backend

**Escolha: Presigned URLs**

**Vantagens:**

- ✅ Backend não processa arquivos grandes (escalabilidade)
- ✅ Upload/download direto ao storage (performance)
- ✅ URLs temporárias (segurança)
- ✅ Reduz carga do servidor Node.js

**Desvantagens:**

- ❌ Fluxo em 2 etapas (mais complexo para o cliente)
- ❌ Depende de conectividade direta ao Supabase

**Conclusão:** Vantagens superam desvantagens para este caso de uso. Mas na aplicação final podem ser revistas de acordo com as necessidades do projeto.

---

### 2. Por que Argon2id (em vez de bcrypt)?

**Vantagens:**

- ✅ Resistente a ataques GPU/ASIC
- ✅ Vencedor da Password Hashing Competition (2015)
- ✅ Configurável (memória, tempo, paralelismo)
- ✅ Proteção contra side-channel attacks

**Desvantagens:**

- ❌ Mais lento que bcrypt
- ❌ Dependendo da configuração, pode consumir mais memória e demorar mais tempo ainda

---

### 3. Por que JWT (em vez de sessões)?

**Alternativas consideradas:**

- ❌ Sessões no Redis
- ❌ Sessões no PostgreSQL

**Escolha: JWT (com Refresh Token)**

**Vantagens:**

- ✅ Stateless (fácil escalar horizontalmente)
- ✅ Não requer consulta ao DB a cada requisição
- ✅ Funciona bem com microservices (possivel escalabilidade futura)

**Desvantagens:**

- ❌ Não pode ser revogado diretamente (mitigado com refresh token)
- ❌ Tamanho maior que session ID

**Solução:** Dual token com rotação resolve parte do problema de revogação, assim como o sistema de dispositivos autorizados.

---

### 4. Por que Fastify (em vez de Express)?

**Vantagens:**

- ✅ 2-3x mais rápido que Express
- ✅ Validação de schema nativa
- ✅ Async/await first-class
- ✅ Plugin system poderoso

**Desvantagens:**

- ❌ Menos middlewares de terceiros que Express

---

## 📈 Comparação: Requisitos vs. Implementação

| Requisito Obrigatório     | Implementação                                 |
| ------------------------- | --------------------------------------------- |
| **Upload autenticado**    | Presigned URLs + JWT + Device ID              |
| **Download performático** | Presigned URLs (< 1s para gerar)              |
| **Metadados**             | 5 campos + timestamps                         |
| **Criptografia**          | AES-256 + Argon2 + HTTPS                      |
| **Performance**           | 100-300ms (geração URL) / 50 - 200 ms (login) |
| **Documentação**          | Swagger + Markdown                            |
| **Instruções setup**      | Docker Compose + README                       |

---

## 🔍 Onde Encontrar Cada Implementação

### Autenticação

- `server/src/application/usecases/RegisterUseCase.ts`
- `server/src/application/usecases/loginUseCase.ts`
- `server/src/application/usecases/RefreshTokenUseCase.ts`
- `server/src/presentation/middlewares/authenticate.ts`

### Upload

- `server/src/application/usecases/InitUploadUseCase.ts`
- `server/src/application/usecases/CompleteUploadUseCase.ts`
- `server/src/infrastructure/external/SupabaseStorageService.ts`

### Download

- `server/src/application/usecases/DownloadFileUseCase.ts`
- `server/src/infrastructure/external/SupabaseStorageService.ts`

### Metadados

- `server/src/application/usecases/ListFilesUseCase.ts`
- `server/src/domain/entities/Files.ts`
- `server/src/infrastructure/repositories/FileRepository.ts`

### Dispositivos

- `server/src/application/usecases/RegisterDeviceUseCase.ts`
- `server/src/application/usecases/RevokeDeviceUseCase.ts`
- `server/src/presentation/middlewares/validateDeviceId.ts`

### WebSocket

- `server/src/presentation/gateways/SocketGateway.ts`

### Banco de Dados

- `server/src/infrastructure/databases/schema.ts`
- `server/src/infrastructure/databases/connection.ts`
- `server/drizzle/` (migrations)

---
