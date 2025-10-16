import { FastifyInstance } from "fastify";
import { Server as SocketIOServer, Socket } from "socket.io";
import { Socket as NetSocket } from "net";
import jwt from "jsonwebtoken";
import { config } from "@/config";

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

    // Registra apenas handlers essenciais do servidor HTTP (somente erros)
    try {
      const httpServer = fastify.server as unknown as import("http").Server;
      httpServer.on("clientError", (err: Error, _socket: NetSocket) => {
        console.error("[SocketGateway] HTTP clientError:", err?.message || err);
      });
    } catch (e) {
      // Não falhar se algum servidor customizado não expuser estes eventos
      console.warn(
        "[SocketGateway] Não foi possível registrar listeners HTTP:",
        e
      );
    }

    this.setupMiddleware();
    this.setupEventHandlers();

    // Escuta erros gerais do Socket.IO
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

    // engine.io-level hooks: apenas erro é logado
    try {
      const engine = (this.io as any).engine;
      if (engine) {
        engine.on("error", (err: any) => {
          console.error(
            "[SocketGateway] engine.io error ->",
            err?.message || err
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
        const handshake = socket.handshake as unknown as {
          auth?: { token?: string; deviceId?: string; deviceName?: string };
          headers?: Record<string, string | string[] | undefined>;
          address?: string;
        };

        const { token, deviceId, deviceName } = (handshake.auth || {}) as {
          token?: string;
          deviceId?: string;
          deviceName?: string;
        };

        // Remote address do handshake quando disponível (não garante engine.conn)
        const remoteAddress = handshake?.address ?? "unknown";
        const headers = handshake?.headers ?? {};

        if (!token) {
          console.warn("[SocketGateway] Rejeitando conexão: token ausente", {
            remoteAddress,
            deviceId,
            origin: headers.origin || headers.referer,
          });
          return next(new Error("Authentication token required"));
        }

        // For security, deviceId must be provided in the handshake
        if (!deviceId) {
          console.warn("[SocketGateway] Rejeitando conexão: deviceId ausente", {
            remoteAddress,
            origin: headers.origin || headers.referer,
          });
          return next(new Error("Device ID required in handshake"));
        }

        // Valida JWT
        const decoded = jwt.verify(token, config.auth.jwtSecret) as {
          sub: string;
          email: string;
          name: string;
        };

        // Adiciona dados do usuário ao socket tipado
        const authSocket = socket as AuthenticatedSocket;
        authSocket.userId = decoded.sub;
        authSocket.deviceId = deviceId; // Guarda o deviceId no socket (obrigatório)
        authSocket.deviceName = deviceName; // deviceName opcional
        authSocket.email = decoded.email;

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
   * Configura event handlers do Socket.IO
   */
  private setupEventHandlers() {
    this.io.on("connection", (socket) => {
      const authSocket = socket as AuthenticatedSocket;
      const { userId, deviceName, email } = authSocket;

      console.log("SocketGateway] Novo dispositivo conectado:", {
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
