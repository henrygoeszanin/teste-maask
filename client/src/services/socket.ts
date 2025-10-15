import { io, Socket } from "socket.io-client";
import {
  getAccessToken,
  getDeviceName,
  clearAllStorage,
} from "../utils/storage";

const SOCKET_URL = "http://localhost:3000";

/**
 * Serviço Socket.IO para comunicação em tempo real
 * Gerencia conexão, autenticação e eventos de dispositivo
 */
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

    // Evento de dispositivo revogado
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
