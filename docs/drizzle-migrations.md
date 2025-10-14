# Versionamento de Banco de Dados com Drizzle ORM

Este projeto utiliza o Drizzle ORM para versionamento e migração do banco de dados PostgreSQL.

## Pré-requisitos

- Banco de dados PostgreSQL configurado e acessível
- Variáveis de ambiente de conexão configuradas (ex: `DATABASE_URL`)
- Dependências instaladas (`pnpm install`)

## Estrutura das Migrations

As migrations do Drizzle ficam normalmente em uma pasta `drizzle` ou `drizzle/migrations` na raiz do projeto.

## Comandos Básicos

### 1. Gerar Migrations

Gere uma nova migration baseada nas alterações do schema:

```sh
pnpm drizzle-kit generate
```

### 2. Rodar as Migrations

Execute as migrations para aplicar as alterações no banco:

```sh
pnpm drizzle-kit push
```

### 3. Verificar Status das Migrations

```sh
pnpm drizzle-kit status:pg
```

> Consulte a documentação do Drizzle para mais comandos e opções avançadas.

## Recomendações

- Sempre gere e rode as migrations após alterar arquivos de schema (`user.schema.ts`, etc)
- Versione a pasta de migrations no controle de versão (git)
- Nunca edite migrations já aplicadas em produção

## Links úteis

- [Documentação Drizzle ORM](https://orm.drizzle.team/docs/overview)
- [Drizzle CLI](https://orm.drizzle.team/docs/cli)

---

**Resumo:**

1. Altere o schema
2. Gere a migration
3. Rode a migration
4. Confirme no banco
