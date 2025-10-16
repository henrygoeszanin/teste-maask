/**
 * SocketGateway.ts
 * Gateway para comunicação em tempo real (Socket.IO).
 * - Autentica conexões via JWT no handshake
 * - Exige `deviceId` no handshake para associar sockets a dispositivos
 * - Emite evento `device-revoked` quando um dispositivo é revogado
 *
 * Comentários em Português; mensagens de erro lançadas em English
 * para manter consistência com a política do projeto.
 */
import { FastifyInstance } from "fastify";
import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "@/config";

// Tipos auxiliares para documentação e clareza
interface SocketHandshakeData {
  token?: string;
  deviceId?: string;
  deviceName?: string;
  headers?: Record<string, string | string[] | undefined>;
  remoteAddress?: string;
}

interface JwtPayload {
  sub: string; // user id
  email: string;
  name?: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedSocket extends Socket {
  userId: string;
  deviceId: string; // Obrigatório: deviceId recebido no handshake
  deviceName?: string; // deviceName fica opcional
  email: string;
}

/**
 * Gateway Socket.IO para comunicação em tempo real
 * Usado principalmente para notificar dispositivos sobre revogações
 */
export class SocketGateway {
  private io: SocketIOServer;

  constructor(fastify: FastifyInstance) {
    // Inicializa Socket.IO com o servidor HTTP do Fastify
    this.io = new SocketIOServer(fastify.server, {
      cors: {
        origin: config.cors?.origin || "http://localhost:5173",
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });

    // Middleware, handlers e listeners de erro separados em helpers
    this.setupMiddleware();
    this.setupEventHandlers();
    this.setupErrorHandlers();
  }

  /**
   * Anexa listeners de erro para Socket.IO e engine.io.
   * Encapsula tentativa de registro para evitar falhas caso o runtime não suporte
   * hooks internos.
   */
  private setupErrorHandlers(): void {
    // Socket.IO global error listener
    try {
      this.io.on("error", (err: Error) => {
        console.error(
          "[SocketGateway] Socket.IO error ->",
          err?.message || err
        );
      });
    } catch (e) {
      console.warn(
        "[SocketGateway] Falha ao anexar listener de erro do Socket.IO:",
        e
      );
    }

    // engine.io-level hooks (se exposto)
    try {
      const engine = (
        this.io as unknown as {
          engine?: { on: (event: string, cb: (err: unknown) => void) => void };
        }
      ).engine;

      if (engine && typeof engine.on === "function") {
        engine.on("error", (err: unknown) => {
          console.error(
            "[SocketGateway] engine.io error ->",
            (err as Error)?.message || err
          );
        });
      }
    } catch (e) {
      console.warn("[SocketGateway] Falha ao anexar listeners engine.io:", e);
    }
  }

  /**
   * Middleware de autenticação para Socket.IO
   * Valida JWT antes de aceitar conexão
   */
  private setupMiddleware() {
    this.io.use((socket, next) => {
      try {
        // Extrai dados do handshake de forma centralizada
        const { token, deviceId, deviceName, headers, remoteAddress } =
          this.parseHandshake(socket);

        if (!token) {
          console.warn("[SocketGateway] Rejeitando conexão: token ausente", {
            remoteAddress,
            deviceId,
            origin: headers?.origin || headers?.referer,
          });
          return next(new Error("Authentication token required"));
        }

        if (!deviceId) {
          console.warn("[SocketGateway] Rejeitando conexão: deviceId ausente", {
            remoteAddress,
            origin: headers?.origin || headers?.referer,
          });
          return next(new Error("Device ID required in handshake"));
        }

        // Verifica token e anexa dados ao socket tipado
        this.verifyAndAttachSocketAuth(
          socket,
          token,
          deviceId,
          deviceName,
          remoteAddress,
          headers
        );

        next();
      } catch (error) {
        // Log detalhado de falhas de autenticação (permanece como error)
        const e = error as Error;
        console.error("[SocketGateway] Erro na autenticação ->", {
          message: e?.message,
          stack: e?.stack,
        });
        next(new Error("Invalid authentication token"));
      }
    });
  }

  /**
   * Extracts token/deviceId/deviceName and headers from the socket handshake.
   *
   * @returns SocketHandshakeData - shape: { token, deviceId, deviceName, headers, remoteAddress }
   *
   * @example
   * handshake example
   * {
   *   auth: { token: 'jwt', deviceId: 'sha256...', deviceName: 'laptop' },
   *   headers: { origin: 'https://app' }
   * }
   */
  private parseHandshake(socket: Socket): SocketHandshakeData {
    const handshake = socket.handshake as unknown as {
      auth?: { token?: string; deviceId?: string; deviceName?: string };
      headers?: Record<string, string | string[] | undefined>;
      address?: string;
    };

    const token = handshake.auth?.token;
    const deviceId = handshake.auth?.deviceId;
    const deviceName = handshake.auth?.deviceName;
    const headers = handshake.headers ?? {};

    // Prefer handshake.address, fallback para X-Forwarded-For se presente
    let remoteAddress = handshake.address ?? "unknown";
    const xff = headers["x-forwarded-for"] as string | undefined;
    if ((!remoteAddress || remoteAddress === "unknown") && xff) {
      remoteAddress = xff.split(",")[0].trim();
    }

    return { token, deviceId, deviceName, headers, remoteAddress };
  }

  /**
   * Verifica o JWT e anexa informações de usuário no socket.
   * Lance Errors com mensagens em English conforme convenção do projeto.
   *
   * @throws Error quando o token for inválido ou claims estiverem ausentes
   */
  private verifyAndAttachSocketAuth(
    socket: Socket,
    token: string,
    deviceId: string,
    deviceName?: string,
    remoteAddress?: string,
    headers?: Record<string, string | string[] | undefined>
  ) {
    // Validação do token JWT
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, config.auth.jwtSecret) as JwtPayload;
    } catch (err) {
      console.error("[SocketGateway] JWT verification failed:", {
        message: (err as Error)?.message || err,
        remoteAddress,
      });
      throw new Error("Invalid authentication token");
    }

    // Verifica claims essenciais
    if (!decoded || !decoded.sub || !decoded.email) {
      console.warn("[SocketGateway] JWT missing required claims", {
        remoteAddress,
        deviceId,
        headers: headers?.origin,
      });
      throw new Error("Invalid authentication token");
    }

    // Anexa ao socket tipado
    const authSocket = socket as AuthenticatedSocket;
    authSocket.userId = decoded.sub;
    authSocket.deviceId = deviceId;
    authSocket.deviceName = deviceName;
    authSocket.email = decoded.email;

    // Log de sucesso da autenticação (informativo)
    console.info("[SocketGateway] Socket authenticated", {
      userId: authSocket.userId,
      deviceId: authSocket.deviceId,
      remoteAddress,
    });
  }

  /**
   * Configura event handlers do Socket.IO
   */
  private setupEventHandlers() {
    this.io.on("connection", (socket) => {
      const authSocket = socket as AuthenticatedSocket;
      const { userId, deviceName, email } = authSocket;

      // Log informativo quando um novo dispositivo se conecta
      console.info("[SocketGateway] Novo dispositivo conectado:", {
        userId,
        deviceName,
        email,
        socketId: socket.id,
      });

      // Resumo do handshake disponível no socket
      const hs = socket.handshake as unknown as {
        headers?: Record<string, string | string[] | undefined>;
        address?: string;
        query?: Record<string, string> | undefined;
        auth?: Record<string, unknown> | undefined;
        time?: string;
      };
      const remoteAddress = hs?.address ?? "unknown";

      // Entra na room do usuário (para broadcasts direcionados)
      void authSocket.join(userId);

      // Evento de heartbeat (cliente envia ping)
      authSocket.on("ping", () => {
        authSocket.emit("pong");
      });

      // Tenta capturar erros no socket
      authSocket.on("error", (err) => {
        const maybeErr = err as unknown as { message?: string };
        const errMsg = maybeErr?.message ?? String(err);
        console.error(
          `[SocketGateway] Socket error on ${socket.id} ->`,
          errMsg
        );
      });

      // Desconexão
      authSocket.on("disconnect", (reason) => {
        // Mantemos apenas um log informativo sobre desconexões
        console.info(
          `[SocketGateway] Disconnected: ${email} (Device: ${deviceName}) - Reason: ${reason} - socketId: ${socket.id} - remote: ${remoteAddress}`
        );
      });
    });
  }

  /**
   * Notifica dispositivo específico sobre revogação
   * Emite evento para todos os sockets na room do usuário
   */
  public notifyDeviceRevoked(
    userId: string,
    deviceId: string,
    deviceName?: string
  ) {
    console.info(
      `[SocketGateway] Notificando revogação: User ${userId}, Device ${deviceId}${
        deviceName ? ` (${deviceName})` : ""
      }`
    );

    this.io.to(userId).emit("device-revoked", {
      deviceId,
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
