import { FastifyInstance } from "fastify";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "@/config";

export interface AuthenticatedSocket {
  userId: string;
  deviceName: string;
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

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  /**
   * Middleware de autenticação para Socket.IO
   * Valida JWT antes de aceitar conexão
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
   * Emite evento para todos os sockets na room do usuário
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
