# Maask - Browser Profile Manager

Sistema para gerenciamento seguro de perfis de navegador.

- **Backend**: Node.js + Fastify + TypeScript + PostgreSQL + Supabase
- **Frontend**: React + Vite + TypeScript

## 🚀 Quick Start

### Com Docker (Recomendado)

```bash
# 1. Configure as variáveis de ambiente
cp server/.env.example server/.env.docker
# Edite server/.env.docker com as credenciais enviadas via Whatsapp

# 2. Suba os containers
docker-compose up -d

# 3. Veja os logs
docker-compose logs -f

# 4. Acesse
# Frontend: http://localhost
# Backend: http://localhost:3000
# API Docs: http://localhost:3000/docs
```

### Parar containers

```bash
docker-compose down
```

### Rebuild após mudanças

```bash
docker-compose up -d --build
```

---

## 💻 Desenvolvimento Local (sem Docker)

### Backend

```bash
cd server

# Instalar dependências
pnpm install

# Configurar ambiente
cp .env.example .env
# Edite .env com suas credenciais

# Rodar migrations
pnpm db:migrate

# Iniciar em modo dev
pnpm dev

# API estará em http://localhost:3000
```

### Frontend

```bash
cd client

# Instalar dependências
pnpm install

# Configurar ambiente
cp .env.example .env
# Edite .env (normalmente VITE_API_URL=http://localhost:3000)

# Iniciar em modo dev
pnpm dev

# App estará em http://localhost:5173
```

---

## 📋 Comandos Úteis

### Docker

```bash
# Ver status dos containers
docker-compose ps

# Ver logs de um serviço específico
docker-compose logs -f api
docker-compose logs -f client

# Acessar shell do container
docker exec -it maask-api sh
docker exec -it maask-client sh

# Remover tudo (containers, volumes, imagens)
docker-compose down -v --rmi all
```

### Backend

```bash
cd server

pnpm dev          # Modo desenvolvimento
pnpm build        # Build para produção
pnpm start        # Iniciar produção
pnpm lint         # Verificar código com ESLint
pnpm lint:fix     # Corrigir problemas automaticamente
pnpm db:generate  # Gerar migrations
pnpm db:migrate   # Executar migrations
pnpm db:studio    # Abrir Drizzle Studio
```

### Frontend

```bash
cd client

pnpm dev          # Modo desenvolvimento
pnpm build        # Build para produção
pnpm preview      # Preview do build de produção
pnpm lint         # Verificar código com ESLint
```

---

## 🏗️ Arquitetura Docker

```
┌─────────────────────────────────────────────────────┐
│                    Client (Port 80)                  │
│              React + Vite + Nginx                    │
└──────────────────────┬──────────────────────────────┘
                       │
                       │ HTTP Requests
                       ▼
┌─────────────────────────────────────────────────────┐
│                API Backend (Port 3000)               │
│        Node.js + Fastify + TypeScript                │
│      (CORS, Rate Limiting, WebSocket)                │
└─────────────────────────────────────────────────────┘
```

### Features:

- ✅ API com Fastify (alta performance)
- ✅ CORS configurado
- ✅ WebSocket support (Socket.IO)
- ✅ Frontend servido com Nginx
- ✅ Hot reload em desenvolvimento

## 🔧 Variáveis de Ambiente

### Docker Compose (.env)

```bash
API_PORT=3000      # Porta do backend (padrão: 3000)
CLIENT_PORT=80     # Porta do frontend (padrão: 80)
```

### Backend (server/.env ou server/.env.docker)

Ver `server/.env.example` para lista completa:

- `DATABASE_URL` - PostgreSQL connection string
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `JWT_SECRET` - Secret para tokens JWT
- `JWT_REFRESH_SECRET` - Secret para refresh tokens
- etc.

### Frontend (client/.env ou client/.env.docker)

```bash
VITE_API_URL=http://localhost:3000
```

---

## 📁 Estrutura do Projeto

```
.
├── server/                 # Backend API
│   ├── src/
│   │   ├── application/    # Use cases, DTOs, Services
│   │   ├── domain/         # Entities, Business Logic
│   │   ├── infrastructure/ # Database, External Services
│   │   └── presentation/   # Controllers, Routes, Middlewares
│   ├── drizzle/            # Database Migrations
│   ├── dockerfile          # Dockerfile do backend
│   ├── nginx.dockerfile    # Dockerfile do Nginx proxy
│   └── nginx.conf          # Configuração do Nginx
│
├── client/                 # Frontend
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── services/       # API client, Socket.IO
│   │   └── utils/          # Utilidades
│   ├── dockerfile          # Dockerfile do frontend
│   └── nginx.conf          # Configuração do Nginx
│
└── docker-compose.yml      # Orquestração completa
```

---

## 🏥 Health Checks

```bash
# API Backend
curl http://localhost:3000/health

# Frontend
curl http://localhost
```

---

## 📚 Documentação da API

Acesse o Swagger UI:

```
http://localhost:3000/docs
```

---

### Rebuild completo

```bash
# Parar e remover tudo
docker-compose down -v

# Build sem cache
docker-compose build --no-cache

# Subir novamente
docker-compose up -d
```
