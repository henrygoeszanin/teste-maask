# Real-Time Device Revocation - Implementação

## 📋 Visão Geral

Este documento detalha a implementação de revogação de dispositivos em tempo real usando Socket.IO, garantindo que dispositivos bloqueados sejam desconectados imediatamente.

## 🎯 Objetivos

1. **Notificação em Tempo Real**: Quando um dispositivo é revogado, notificar imediatamente o dispositivo bloqueado
2. **Logout Automático**: Dispositivo revogado deve ser deslogado automaticamente
3. **Validação no Refresh Token**: Verificar status do dispositivo a cada renovação de token
4. **Experiência do Usuário**: Mensagens claras sobre bloqueio/revogação

---

## 📦 Dependências Necessárias

### Backend

```bash
pnpm add socket.io
pnpm add -D @types/socket.io
```

### Frontend

```bash
pnpm add socket.io-client
```

---

## 🏗️ Arquitetura

```
┌─────────────────┐
│   Dispositivo A │  (revoga B)
│   (Web Client)  │
└────────┬────────┘
         │ POST /devices/revoke
         ▼
┌─────────────────────────────────┐
│   Backend (Fastify + Socket.IO) │
│                                 │
│  1. RevokeDeviceUseCase         │
│  2. Atualiza DB (status=revoked)│
│  3. Emite evento Socket.IO      │
│     → room: userId              │
│     → event: "device-revoked"   │
└────────┬────────────────────────┘
         │ Socket.IO Broadcast
         ▼
┌─────────────────┐
│   Dispositivo B │  (bloqueado)
│   (Web Client)  │
│                 │
│  1. Recebe evento│
│  2. Limpa tokens│
│  3. Redireciona │
│  4. Exibe aviso │
└─────────────────┘
```

---

## 🔧 Implementação Backend

### 1. Gateway Socket.IO

**Arquivo**: `server/src/presentation/gateways/SocketGateway.ts`

```typescript
import { FastifyInstance } from "fastify";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "@/config";

export interface AuthenticatedSocket {
  userId: string;
  deviceName: string;
  email: string;
}

export class SocketGateway {
  private io: SocketIOServer;

  constructor(fastify: FastifyInstance) {
    // Inicializa Socket.IO com o servidor HTTP do Fastify
    this.io = new SocketIOServer(fastify.server, {
      cors: {
        origin: config.cors.origin || "http://localhost:5173",
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  /**
   * Middleware de autenticação para Socket.IO
   */
  private setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        const deviceName = socket.handshake.auth.deviceName;

        if (!token) {
          return next(new Error("Authentication token required"));
        }

        if (!deviceName) {
          return next(new Error("Device name required"));
        }

        // Valida JWT
        const decoded = jwt.verify(token, config.auth.jwtSecret) as {
          sub: string;
          email: string;
          name: string;
        };

        // Adiciona dados do usuário ao socket
        (socket as any).userId = decoded.sub;
        (socket as any).deviceName = deviceName;
        (socket as any).email = decoded.email;

        console.log(
          `[SocketGateway] Cliente autenticado: ${decoded.email} (Device: ${deviceName})`
        );

        next();
      } catch (error) {
        console.error("[SocketGateway] Erro na autenticação:", error);
        next(new Error("Invalid authentication token"));
      }
    });
  }

  /**
   * Configura event handlers do Socket.IO
   */
  private setupEventHandlers() {
    this.io.on("connection", (socket) => {
      const userId = (socket as any).userId;
      const deviceName = (socket as any).deviceName;
      const email = (socket as any).email;

      console.log(
        `[SocketGateway] Nova conexão: ${email} (Device: ${deviceName})`
      );

      // Entra na room do usuário (para broadcasts direcionados)
      socket.join(userId);

      // Evento de heartbeat (cliente envia ping)
      socket.on("ping", () => {
        socket.emit("pong");
      });

      // Desconexão
      socket.on("disconnect", (reason) => {
        console.log(
          `[SocketGateway] Desconectado: ${email} (Device: ${deviceName}) - Razão: ${reason}`
        );
      });
    });
  }

  /**
   * Notifica dispositivo específico sobre revogação
   */
  public notifyDeviceRevoked(userId: string, deviceName: string) {
    console.log(
      `[SocketGateway] Notificando revogação: User ${userId}, Device ${deviceName}`
    );

    this.io.to(userId).emit("device-revoked", {
      deviceName,
      message:
        "Seu dispositivo foi revogado por outro dispositivo. Você será desconectado.",
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Retorna instância do Socket.IO (para uso em outros lugares)
   */
  public getIO(): SocketIOServer {
    return this.io;
  }
}
```

---

### 2. Integração no main.ts

**Arquivo**: `server/src/main.ts`

```typescript
// ...imports existentes
import { SocketGateway } from "@/presentation/gateways/SocketGateway";

// Após criar a instância do app Fastify
const app = fastify({
  logger: {
    level: config.log.level,
    transport: {
      target: "pino-pretty",
      options: {
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      },
    },
  },
});

// Registra rotas e middlewares (código existente)
// ...

// ✨ NOVO: Inicializa Socket.IO Gateway
let socketGateway: SocketGateway;

app.addHook("onReady", async () => {
  socketGateway = new SocketGateway(app);
  console.log("[Main] Socket.IO Gateway inicializado");
});

// Exporta socketGateway para uso em outros módulos
export { socketGateway };

// Inicia servidor
const start = async () => {
  try {
    await app.listen({ port: config.server.port, host: "0.0.0.0" });
    console.log(`[Main] Servidor rodando na porta ${config.server.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
```

---

### 3. Atualizar RevokeDeviceUseCase

**Arquivo**: `server/src/application/usecases/RevokeDeviceUseCase.ts`

Adicionar parâmetro opcional para o SocketGateway:

```typescript
import { SocketGateway } from "@/presentation/gateways/SocketGateway";

export class RevokeDeviceUseCase {
  constructor(
    private deviceRepository: IDeviceRepository,
    private userRepository: IUserRepository,
    private socketGateway?: SocketGateway // ✨ Opcional para não quebrar testes
  ) {}

  async execute(input: RevokeDeviceInput): Promise<void> {
    // ... código de validação existente ...

    try {
      // Marca dispositivo como revogado
      deviceToRevoke.revoke();
      await this.deviceRepository.update(deviceToRevoke);

      console.log(
        `[RevokeDevice] Device ${deviceNameToRevoke} revoked successfully`
      );

      // ✨ NOVO: Notifica via Socket.IO
      if (this.socketGateway) {
        this.socketGateway.notifyDeviceRevoked(userId, deviceNameToRevoke);
        console.log(`[RevokeDevice] Socket.IO notification sent`);
      }
    } catch (error) {
      console.error(`[RevokeDevice] Error revoking device:`, error);
      throw new AppError("Failed to revoke device. Please try again.", 500);
    }
  }
}
```

---

### 4. Atualizar DeviceRevocationController

**Arquivo**: `server/src/presentation/controllers/DeviceRevocationController.ts`

```typescript
import { socketGateway } from "@/main"; // ✨ Import do gateway

export class DeviceRevocationController {
  static async revokeDevice(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    // ... código de validação existente ...

    const deviceRepository = new DeviceRepository();
    const userRepository = new UserRepository();

    // ✨ Passa socketGateway para o use case
    const useCase = new RevokeDeviceUseCase(
      deviceRepository,
      userRepository,
      socketGateway
    );

    try {
      await useCase.execute({
        userId,
        deviceNameToRevoke: body.deviceName,
        currentDeviceName,
        password: body.password,
        reason: body.reason,
      });

      // ... resposta de sucesso ...
    } catch (error: any) {
      // ... tratamento de erros ...
    }
  }
}
```

---

### 5. Validação de Dispositivo no Refresh Token

**Arquivo**: `server/src/application/usecases/RefreshTokenUseCase.ts`

```typescript
import { IDeviceRepository } from "../interfaces/IDeviceRepository";
import { DeviceRepository } from "@/infrastructure/repositories/DeviceRepository";

export class RefreshTokenUseCase {
  constructor(
    private readonly userRepo: IUserRepository = new UserRepository(),
    private readonly deviceRepo: IDeviceRepository = new DeviceRepository()
  ) {}

  async execute(data: RefreshTokenDTO, deviceName?: string) {
    try {
      const decoded = jwt.verify(
        data.refreshToken,
        config.auth.jwtRefreshSecret
      ) as { sub: string };

      const user = await this.userRepo.findById(decoded.sub);
      if (!user) throw new Error("Usuário não encontrado");

      // ✨ NOVO: Valida status do dispositivo
      if (deviceName) {
        const device = await this.deviceRepo.findByDeviceName(deviceName);

        if (!device) {
          throw new Error("Device not found");
        }

        if (device.userId !== decoded.sub) {
          throw new Error("Device does not belong to this user");
        }

        if (device.isRevoked()) {
          throw new Error(
            "DEVICE_REVOKED: This device has been revoked. Please login again."
          );
        }

        if (!device.isActive()) {
          throw new Error(
            "DEVICE_INACTIVE: This device is inactive. Please login again."
          );
        }
      }

      const payload = { sub: user.id, email: user.email, name: user.name };
      const expiresIn = config.auth.accessTokenExpiresIn;
      const accessToken = jwt.sign(payload, config.auth.jwtSecret, {
        expiresIn,
      });

      return {
        accessToken,
        expiresIn,
      };
    } catch (error: any) {
      // Propaga erro específico de dispositivo revogado
      if (
        error.message?.includes("DEVICE_REVOKED") ||
        error.message?.includes("DEVICE_INACTIVE")
      ) {
        throw error;
      }
      throw new Error("Refresh token inválido ou expirado");
    }
  }
}
```

---

### 6. Atualizar AuthController

**Arquivo**: `server/src/presentation/controllers/AuthController.ts`

```typescript
async refresh(request: FastifyRequest, reply: FastifyReply) {
  const { refreshToken } = request.body as RefreshTokenDTO;

  // ✨ Extrai deviceName do header
  const deviceName = request.headers["x-device-name"] as string | undefined;

  try {
    const result = await this.refreshTokenUseCase.execute(
      { refreshToken },
      deviceName // ✨ Passa deviceName para validação
    );
    return reply.status(200).send(result);
  } catch (error: any) {
    console.error("[AuthController] Refresh token error:", error.message);

    // ✨ Retorna erro específico para dispositivo revogado
    if (error.message?.includes("DEVICE_REVOKED")) {
      return reply.status(403).send({
        error: "Device revoked",
        code: "DEVICE_REVOKED",
        message: "This device has been revoked. Please login again.",
      });
    }

    if (error.message?.includes("DEVICE_INACTIVE")) {
      return reply.status(403).send({
        error: "Device inactive",
        code: "DEVICE_INACTIVE",
        message: "This device is inactive. Please login again.",
      });
    }

    return reply.status(401).send({ error: error.message });
  }
}
```

---

## 🎨 Implementação Frontend

### 1. Serviço Socket.IO

**Arquivo**: `client/src/services/socket.ts`

```typescript
import { io, Socket } from "socket.io-client";
import {
  getAccessToken,
  getDeviceName,
  clearAllStorage,
} from "../utils/storage";

const SOCKET_URL = "http://localhost:3000";

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  /**
   * Conecta ao servidor Socket.IO
   */
  connect(): void {
    const token = getAccessToken();
    const deviceName = getDeviceName();

    if (!token || !deviceName) {
      console.warn("[Socket] Não conectado: sem token ou deviceName");
      return;
    }

    if (this.socket?.connected) {
      console.log("[Socket] Já conectado");
      return;
    }

    console.log("[Socket] Conectando...");

    this.socket = io(SOCKET_URL, {
      auth: {
        token,
        deviceName,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventHandlers();
  }

  /**
   * Configura event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Conexão estabelecida
    this.socket.on("connect", () => {
      console.log("[Socket] Conectado ao servidor");
      this.reconnectAttempts = 0;
    });

    // Erro de conexão
    this.socket.on("connect_error", (error) => {
      console.error("[Socket] Erro de conexão:", error.message);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error("[Socket] Máximo de tentativas de reconexão atingido");
        this.disconnect();
      }
    });

    // ✨ Evento de dispositivo revogado
    this.socket.on(
      "device-revoked",
      (data: { deviceName: string; message: string }) => {
        const currentDeviceName = getDeviceName();

        console.warn("[Socket] Dispositivo revogado:", data);

        // Verifica se é o dispositivo atual
        if (data.deviceName === currentDeviceName) {
          this.handleDeviceRevoked(data.message);
        }
      }
    );

    // Pong (resposta ao ping)
    this.socket.on("pong", () => {
      console.log("[Socket] Pong recebido");
    });

    // Desconexão
    this.socket.on("disconnect", (reason) => {
      console.log("[Socket] Desconectado:", reason);
    });
  }

  /**
   * Trata revogação do dispositivo atual
   */
  private handleDeviceRevoked(message: string): void {
    console.error("[Socket] ⚠️ DISPOSITIVO REVOGADO ⚠️");

    // Desconecta socket
    this.disconnect();

    // Limpa localStorage
    clearAllStorage();

    // Redireciona para login com mensagem
    alert(`🚫 ${message}\n\nVocê será redirecionado para a tela de login.`);
    window.location.href = "/?revoked=true";
  }

  /**
   * Envia ping para manter conexão ativa
   */
  sendPing(): void {
    if (this.socket?.connected) {
      this.socket.emit("ping");
    }
  }

  /**
   * Desconecta do servidor
   */
  disconnect(): void {
    if (this.socket) {
      console.log("[Socket] Desconectando...");
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Verifica se está conectado
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

// Exporta instância única (Singleton)
export const socketService = new SocketService();
```

---

### 2. Atualizar App.tsx

**Arquivo**: `client/src/App.tsx`

```typescript
import { useState, useEffect } from "react";
import { socketService } from "./services/socket";
// ...outros imports

function App() {
  const [screen, setScreen] = useState<Screen>("auth");
  const [activeTab, setActiveTab] = useState<DashboardTab>("files");

  useEffect(() => {
    // Determinar tela inicial
    if (isAuthenticated() && hasCriptographyCode()) {
      setScreen("dashboard");

      // ✨ Conecta ao Socket.IO quando logado
      socketService.connect();

      // ✨ Ping periódico para manter conexão
      const pingInterval = setInterval(() => {
        socketService.sendPing();
      }, 30000); // 30 segundos

      return () => {
        clearInterval(pingInterval);
        socketService.disconnect();
      };
    } else {
      setScreen("auth");

      // ✨ Verifica se foi redirecionado por revogação
      const params = new URLSearchParams(window.location.search);
      if (params.get("revoked") === "true") {
        alert(
          "⚠️ Seu dispositivo foi revogado por outro dispositivo.\n\nFaça login novamente para continuar."
        );
        window.history.replaceState({}, "", "/");
      }
    }
  }, []);

  const handleAuthSuccess = () => {
    setScreen("dashboard");

    // ✨ Conecta ao Socket.IO após login
    socketService.connect();
  };

  const handleLogout = () => {
    if (confirm("Tem certeza que deseja sair?")) {
      // ✨ Desconecta Socket.IO antes de limpar
      socketService.disconnect();

      clearAllStorage();
      setScreen("auth");
    }
  };

  // ... resto do código
}
```

---

### 3. Atualizar API Service (Refresh Token)

**Arquivo**: `client/src/services/api.ts`

```typescript
async function refreshAccessToken(): Promise<string> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken();
      const deviceName = getDeviceName(); // ✨ Pega deviceName

      if (!refreshToken || refreshToken.length < 10) {
        console.error("[API] RefreshToken inválido ou ausente");
        throw new Error("No refresh token available");
      }

      console.log("[API] Fazendo request de refresh token...");

      // ✨ Adiciona X-Device-Name no header
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (deviceName) {
        headers["X-Device-Name"] = deviceName;
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers,
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));

        // ✨ Detecta dispositivo revogado
        if (
          errorData.code === "DEVICE_REVOKED" ||
          errorData.code === "DEVICE_INACTIVE"
        ) {
          console.error("[API] Dispositivo bloqueado:", errorData.message);

          // Limpa dados e redireciona
          clearAllStorage();
          alert(`⚠️ ${errorData.message}`);
          window.location.href = "/?revoked=true";
          throw new Error(errorData.message);
        }

        console.error(
          "[API] Falha no refresh token:",
          response.status,
          errorData
        );
        throw new Error("Failed to refresh token");
      }

      const data = await response.json();
      const currentRefreshToken = getRefreshToken();

      if (currentRefreshToken) {
        saveTokens(data.accessToken, currentRefreshToken);
      }

      console.log("[API] Access token renovado");
      return data.accessToken;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
```

---

## ✅ Checklist de Implementação

### Backend

- [ ] Instalar `socket.io` e `@types/socket.io`
- [ ] Criar `SocketGateway.ts`
- [ ] Integrar Socket.IO no `main.ts`
- [ ] Atualizar `RevokeDeviceUseCase` para emitir eventos
- [ ] Atualizar `DeviceRevocationController` para usar gateway
- [ ] Adicionar validação de dispositivo no `RefreshTokenUseCase`
- [ ] Atualizar `AuthController` para validar deviceName no refresh

### Frontend

- [ ] Instalar `socket.io-client`
- [ ] Criar `socket.ts` service
- [ ] Integrar Socket.IO no `App.tsx`
- [ ] Atualizar `api.ts` para enviar `X-Device-Name` no refresh
- [ ] Tratar erro de dispositivo revogado no refresh token
- [ ] Adicionar mensagem de aviso na tela de login

### Testes

- [ ] Testar revogação em tempo real (2 dispositivos simultaneamente)
- [ ] Testar refresh token com dispositivo revogado
- [ ] Testar reconexão após queda de rede
- [ ] Testar múltiplos dispositivos do mesmo usuário

---

## 🔒 Considerações de Segurança

1. **Autenticação obrigatória**: Socket.IO valida JWT antes de aceitar conexão
2. **Rooms por usuário**: Cada usuário tem sua própria room (userId)
3. **Validação dupla**: Refresh token valida status do dispositivo no banco
4. **Logout forçado**: Dispositivo revogado é imediatamente desconectado
5. **Mensagens claras**: Usuário entende por que foi desconectado

---

## 📊 Fluxos de Dados

### Fluxo 1: Revogação em Tempo Real

```
User A (Device 1) → Revoga Device 2
                   ↓
              Backend valida
                   ↓
           Atualiza DB (revoked)
                   ↓
     Socket.IO → emit("device-revoked")
                   ↓
      User A (Device 2) recebe evento
                   ↓
            Limpa localStorage
                   ↓
         Redireciona para login
                   ↓
            Exibe mensagem
```

### Fluxo 2: Validação no Refresh Token

```
Device 2 (revogado) → Token expira
                     ↓
              Tenta refresh token
                     ↓
     Backend valida deviceName no DB
                     ↓
         Status = "revoked" ❌
                     ↓
      Retorna 403 DEVICE_REVOKED
                     ↓
       Frontend detecta erro
                     ↓
         Limpa localStorage
                     ↓
      Redireciona para login
```

---

## 🚀 Próximos Passos

1. Implementar backend primeiro (Socket.IO + validações)
2. Testar backend com ferramenta como Postman ou Socket.IO client
3. Implementar frontend
4. Testar fluxo completo end-to-end
5. Adicionar logs de auditoria para revogações
6. Considerar adicionar rate limiting para revogações

---

## 📝 Notas Adicionais

- Socket.IO usa websockets quando possível, fallback para polling
- Conexões são automaticamente gerenciadas (reconexão automática)
- Room do usuário permite broadcast direcionado
- Validação no refresh token é uma camada extra de segurança
- Mensagens de erro são claras para melhor UX
