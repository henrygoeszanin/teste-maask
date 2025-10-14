# Copilot Instructions - Maask Backend Challenge

## Contexto do Projeto

Este é o desafio back-end da Maask. O objetivo é construir uma API para gerenciar perfis de navegador de forma segura e performática.

### Desafio Back-end - Maask (Node/TypeScript + Supabase)

#### Contexto

O Launcher da Maask precisa abrir/fechar perfis de navegador de forma segura e rápida. Ao fechar, o Launcher envia a "pasta do perfil" para o back-end (armazenamento seguro). Ao abrir um navegador, o back-end devolve essa pasta para o launcher decidir o que fazer. Também haverá uma rota para consultar metadados de um perfil salvo.

O perfil do usuário (pasta do navegador) é composto por:

- Arquivos de cookies
- Arquivos de histórico
- Arquivos de favoritos
- Arquivos de extensões
- Arquivos de configuração
- Arquivos de dados do navegador

**Importante:** Todos esses arquivos são sensíveis e devem ser tratados, armazenados e enviados de forma segura. São mais sensíveis que senhas, por exemplo.

#### Objetivo

Construir uma API back-end (Node.js + TypeScript) que:

1. Salve a pasta de um perfil de navegador (upload) de forma autenticada e segura.
2. Baixe/restaure a pasta (download/restauração) de forma autenticada e performática.
3. Informe metadados do perfil salvo.
4. Trate dados sensíveis com criptografia em repouso e em trânsito.
5. Tenha tempo de resposta adequado (o usuário não pode ficar esperando muito tempo para abrir ou fechar um navegador).

#### Requisitos Mínimos

- Upload e download de pastas de perfil distintas
- Consulta de metadados de um perfil salvo (nome, data de criação, data de última modificação, tamanho, etc)
- Tratamento como dado sensível (encriptação, autenticação, urls assinadas, dentre outros exemplos)
- Documentação das rotas (OpenAPI ou Markdown)
- Instruções para rodar localmente e testar
- Lançamentos de erros em ingles
- COmentários de codigo em portgues

#### Considerações Técnicas

- Os perfis podem variar entre 50 MB e 500 MB compactados
- Priorize streams em vez de buffers para evitar travamentos
- A pasta `Default` é a mais importante, nela tem os cookies, Local Storage, histórico, etc.
- Você pode zipar a pasta e/ou utilizar outras estratégias antes de fazer o upload

## Stack Tecnológica

### Backend Framework

- **Fastify** - Framework web de alta performance para Node.js
- **TypeScript** - Linguagem principal do projeto

### Banco de Dados

- **PostgreSQL** - Banco de dados relacional
- **Drizzle ORM** - ORM TypeScript-first para manipulação do banco
- **postgres** - Driver PostgreSQL para Node.js

### Validação e Segurança

- **Zod** - Schema validation para DTOs e validação de dados de entrada
- **Argon2** - Hash de senhas com pepper e salt
- **jsonwebtoken** - Geração e validação de tokens JWT (accessToken e refreshToken)
- Middleware de validação customizado (`validateBody`) para validar requisições

### Documentação

- **@fastify/swagger** - Geração automática de especificação OpenAPI
- **@fastify/swagger-ui** - Interface Swagger UI disponível em `/docs`

### Ambiente e Configuração

- **dotenv** - Gerenciamento de variáveis de ambiente
- **tsx** - Executor TypeScript para desenvolvimento
- **pnpm** - Gerenciador de pacotes (v10.17.1)

## Estrutura da Aplicação

A aplicação segue os princípios de **Clean Architecture** e **Domain-Driven Design (DDD)**:

```
src/
├── main.ts                          # Entry point da aplicação
├── config/                          # Configurações da aplicação
│   └── index.ts
├── domain/                          # Camada de Domínio
│   ├── entities/                    # Entidades de negócio
│   │   └── User.ts
│   └── errors/                      # Erros de domínio
│       ├── AppError.ts
│       └── NotFoundError.ts
├── application/                     # Camada de Aplicação
│   ├── dtos/                        # Data Transfer Objects com Zod schemas
│   │   └── user.dto.ts
│   ├── interfaces/                  # Contratos/Interfaces
│   │   └── IRepository.ts
│   ├── services/                    # Serviços de aplicação
│   │   └── ExampleService.ts
│   └── usecases/                    # Casos de uso
│       └── ExampleUseCase.ts
├── infrastructure/                  # Camada de Infraestrutura
│   ├── databases/                   # Banco de dados
│   │   ├── connection.ts
│   │   └── schema.ts
│   ├── external/                    # Serviços externos
│   │   └── ExternalApiService.ts
│   └── repositories/                # Implementação dos repositórios
│       └── UserRepository.ts
└── presentation/                    # Camada de Apresentação
    ├── controllers/                 # Controllers HTTP
    │   ├── HealthController.ts
    │   └── UserController.ts
    ├── routes/                      # Definição de rotas
    │   ├── index.ts
    │   ├── health.routes.ts
    │   └── user.routes.ts
    └── validateBody.ts              # Middleware de validação com Zod
```

### Camadas da Arquitetura

1. **Domain (Domínio)**

   - Entidades de negócio puras
   - Regras de negócio fundamentais
   - Erros de domínio customizados
   - Independente de frameworks

2. **Application (Aplicação)**

   - DTOs com validação Zod
   - Casos de uso da aplicação
   - Serviços de aplicação
   - Interfaces/contratos

3. **Infrastructure (Infraestrutura)**

   - Implementação de repositórios
   - Conexão com banco de dados (Drizzle ORM)
   - Integrações com serviços externos
   - Schemas do banco de dados

4. **Presentation (Apresentação)**
   - Controllers Fastify
   - Rotas HTTP
   - Middlewares de validação
   - Tratamento de erros HTTP

### Padrões e Práticas

- **Dependency Injection**: Injeção de dependências via construtor
- **Repository Pattern**: Abstração do acesso a dados
- **DTO Pattern**: Validação e transferência de dados com Zod
- **Error Handling**: Tratamento centralizado de erros no main.ts
- **Path Aliases**: Uso de aliases (@config, @domain, @application, etc.) via tsconfig.json

### Scripts Disponíveis

```bash
pnpm dev      # Modo desenvolvimento com hot reload (tsx watch)
pnpm start    # Modo produção (requer build)
pnpm test     # Testes (a implementar)
```

## Diretrizes para o Copilot

Ao trabalhar neste projeto:

1. **Mantenha a Clean Architecture**: Respeite as camadas e suas responsabilidades
2. **Use Zod para validação**: Todos os DTOs devem ser schemas Zod
3. **Middleware de validação**: Use `validateBody(schema)` nas rotas que recebem dados
4. **Documentação Swagger**: Toda nova rota deve incluir `schema` com tags, description, body e responses
5. **Streams para arquivos grandes**: Priorize streams ao lidar com uploads/downloads
6. **Segurança em primeiro lugar**: Dados de perfis são altamente sensíveis
7. **Performance é crítica**: O usuário não pode esperar muito para abrir/fechar navegadores
8. **Documentação clara**: Documente rotas, decisões técnicas e trade-offs
9. **TypeScript strict**: Mantenha tipagem forte em todo o código

### Convenções de Código para Rotas e DTOs

#### Schemas Zod nos DTOs

- **Nomenclatura**: Use **PascalCase** para schemas Zod (ex: `CreateUserSchema`, `UpdateUserSchema`)
- **Tipos derivados**: Use o mesmo nome com sufixo `DTO` (ex: `type CreateUserDTO = z.infer<typeof CreateUserSchema>`)
- **Schemas de resposta**: Sempre crie schemas de resposta para documentação Swagger
  - Para respostas de sucesso com dados: envolva em um objeto `data`
  - Para respostas de criação/atualização: use estrutura `{ message: string, data: {...} }`
  - Para respostas de listagem/consulta simples: use estrutura `{ data: {...} }`
- **Schema de erro**: Sempre exporte `ErrorResponseSchema` para respostas de erro

Exemplo:

```typescript
// Schema de entrada
export const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});
export type CreateUserDTO = z.infer<typeof CreateUserSchema>;

// Schema de resposta de criação (201)
export const UserCreatedResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    createdAt: z.string(),
  }),
});

// Schema de resposta de consulta (200)
export const UserDataResponseSchema = z.object({
  data: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }),
});

// Schema de erro
export const ErrorResponseSchema = z.object({
  error: z.string(),
});
```

#### Rotas com Fastify + Zod

- **Type Provider**: Sempre use `.withTypeProvider<ZodTypeProvider>()` antes de definir rotas
- **Helper de exemplos**: Use a função `withExamples` para adicionar exemplos aos schemas
- **Schemas na configuração**:
  - `body`: Schema Zod para body da requisição
  - `querystring`: Schema Zod para query params
  - `params`: Schema Zod para route params
  - `headers`: Schema Zod para headers customizados
  - `response`: Objeto com códigos HTTP e schemas de resposta
- **Exemplos**: Sempre adicione pelo menos um exemplo para cada schema

Exemplo:

```typescript
app.withTypeProvider<ZodTypeProvider>().post(
  "/users",
  {
    schema: {
      tags: ["Users"],
      description: "Criar um novo usuário",
      body: withExamples(CreateUserSchema, [
        {
          name: "João da Silva",
          email: "joao@email.com",
        },
      ]),
      response: {
        201: withExamples(UserCreatedResponseSchema, [
          {
            message: "Usuário criado com sucesso",
            data: {
              id: "uuid-123",
              name: "João da Silva",
              email: "joao@email.com",
              createdAt: "2025-10-14T12:00:00.000Z",
            },
          },
        ]),
        400: withExamples(ErrorResponseSchema, [
          { error: "Invalid request body" },
        ]),
        409: withExamples(ErrorResponseSchema, [
          { error: "Email already registered" },
        ]),
      },
      security: [{ bearerAuth: [] }], // Se rota protegida
    },
  },
  controller.create
);
```

#### Controllers

- **Respostas padronizadas**: Sempre retorne respostas no formato definido nos schemas
- **Conversão de datas**: Converta `Date` para ISO string ao retornar (`.toISOString()`)
- **Status codes apropriados**:
  - `200` - Sucesso em consultas/atualizações
  - `201` - Sucesso em criações
  - `400` - Erro de validação
  - `401` - Não autenticado
  - `403` - Sem permissão
  - `404` - Recurso não encontrado
  - `409` - Conflito (ex: email já cadastrado)

Exemplo:

```typescript
static async create(request: FastifyRequest, reply: FastifyReply) {
  const data = request.body as CreateUserDTO;
  const user = await useCase.execute(data);

  return reply.status(201).send({
    message: "Usuário criado com sucesso",
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    },
  });
}
```

## Commits

- Use mensagens de commit claras e descritivas
- Siga o padrão Conventional Commits (feat, fix, docs, style, refactor, test, chore)
- Faça commits pequenos e focados
