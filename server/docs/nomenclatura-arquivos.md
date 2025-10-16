# Nomenclatura de Arquivos e Pastas (Server)

Guia simples e prático para manter nomes consistentes no back-end (Node.js + TypeScript) deste projeto.

Observação: siga as convenções abaixo. Quando houver arquivos existentes com um padrão já consolidado, priorize a consistência com o que já está no repositório.

## Pastas

- nomes curtos em minúsculas; use kebab-case quando houver mais de uma palavra
  - exemplos: `application/`, `domain/`, `infrastructure/`, `presentation/`, `drizzle/`, `external-services/` (se necessário)

## Arquivos TypeScript por tipo

- entrypoints: `main.ts`
- arquivos padrão de pasta: `index.ts` (barrel e/ou export centralizado)

### Controllers

- PascalCase + sufixo `Controller.ts`
  - exemplos: `AuthController.ts`, `UserController.ts`, `FileController.ts`

### Use Cases

- PascalCase + sufixo `UseCase.ts`
  - exemplos: `InitUploadUseCase.ts`, `CompleteUploadUseCase.ts`, `DownloadFileUseCase.ts`

### Services

- PascalCase + sufixo `Service.ts`
  - exemplos: `ExternalApiService.ts`, `SupabaseStorageService.ts`

### Entities (Domínio)

- PascalCase
- Preferir singular (p. ex., `User.ts`). Quando representar coleção/tabela, plural pode ser aceito, conforme o projeto (`Devices.ts`, `Files.ts`).

### Repositories

- PascalCase + sufixo `Repository.ts`
  - exemplos: `UserRepository.ts`, `DeviceRepository.ts`, `FileRepository.ts`

### Interfaces

- Prefixo `I` + PascalCase
  - exemplos: `IUserRepository.ts`, `IFileRepository.ts`, `IDeviceRepository.ts`

### DTOs (Zod schemas)

- kebab-case (base) + `.dto.ts`
  - exemplos: `user.dto.ts`, `auth.dto.ts`, `refresh-token.dto.ts`
  - dentro do arquivo, usar Zod com nomes em PascalCase para schemas (ex.: `CreateUserSchema`)

### Rotas

- Preferir kebab-case + `.routes.ts`
  - exemplos preferidos: `auth.routes.ts`, `user.routes.ts`

### Middlewares

- camelCase descritivo
  - exemplos: `authenticate.ts`, `validateBody.ts`, `rateLimiters.ts`, `validateDeviceId.ts`

### Utils e Helpers

- kebab-case quando fizer sentido; em arquivos genéricos, pode ser nome simples em minúsculas
  - exemplos: `utils.ts`, `crypto-helpers.ts`, `stream-utils.ts`

### Tipos e Declarações

- para declarações globais: `nome.d.ts` (minúsculas)
  - exemplo: `types/fastify.d.ts`

### Mapeamento de Banco / Migrations (Drizzle)

- migrations: prefixo ordinal ou timestamp + snake_case descritivo + extensão `.sql`
  - exemplo: `0000_lazy_blob.sql`
- meta gerado pelo Drizzle deve ser mantido como está

### Testes

- arquivos de teste próximos ao código ou em `__tests__/`
- sufixos: `.spec.ts` ou `.test.ts`
  - exemplos: `UserController.spec.ts`, `init-upload.usecase.test.ts`

## Regras Gerais

- Evite espaços e caracteres especiais; use hífen (`-`) para separar palavras em nomes de arquivos/pastas quando necessário.
- Sensibilidade a maiúsculas/minúsculas: mesmo no Windows, trate os nomes como case-sensitive para compatibilidade com ambientes Linux/containers.
- Nomeie pelo propósito: o nome deve comunicar o papel do arquivo na arquitetura (controller, service, use case, dto, repository, middleware, etc.).
- Mantenha consistência local: ao alterar/estender módulos existentes, siga o padrão já utilizado naquela pasta.
