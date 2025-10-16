import { io, Socket } from "socket.io-client";
import {
  getAccessToken,
  getDeviceName,
  clearAllStorage,
  getDeviceId,
} from "../utils/storage";

const SOCKET_URL = "http://localhost:3000";

// Tipos locais para manipulação segura (apenas leitura/attach de listeners)
type EngineLike = {
  on?: (event: string, cb: (...args: unknown[]) => void) => void;
  transport?: TransportLike | unknown;
};

type TransportLike = {
  on?: (event: string, cb: (...args: unknown[]) => void) => void;
  ws?:
    | {
        addEventListener?: (
          event: string,
          listener: (ev: unknown) => void
        ) => void;
      }
    | unknown;
  name?: string;
};

/**
 * Serviço Socket.IO para comunicação em tempo real
 * Gerencia conexão, autenticação e eventos de dispositivo
 */
class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private connectPromise: Promise<void> | null = null;

  // Tipagens locais para acessar o engine/transport do socket.io-client
  // Usadas apenas para adicionar listeners de debug sem recorrer a `any`

  /**
   * Conecta ao servidor Socket.IO e retorna uma Promise que resolve quando conectado
   */
  async connect(timeoutMs = 10000): Promise<void> {
    const token = getAccessToken();
    const deviceId = getDeviceId();
    const deviceName = getDeviceName();

    console.info("[Socket] === INÍCIO DA CONEXÃO ===");
    console.info(
      "[Socket] Token presente:",
      !!token,
      token ? `(len=${token.length})` : "MISSING"
    );
    console.info(
      "[Socket] DeviceId presente:",
      !!deviceId,
      deviceId || "MISSING"
    );
    console.info(
      "[Socket] DeviceName presente:",
      !!deviceName,
      deviceName || "MISSING"
    );

    if (!token || !deviceId) {
      const error = `Missing credentials - token: ${!!token}, deviceId: ${!!deviceId}`;
      console.error("[Socket] ❌ Conexão bloqueada:", error);
      return Promise.reject(new Error(error));
    }

    if (this.socket?.connected) {
      console.log("[Socket] ✅ Já conectado");
      return Promise.resolve();
    }

    // Evita múltiplas tentativas concorrentes de conexão
    if (this.connectPromise) {
      console.warn("[Socket] ⚠️ Tentativa de conexão já em andamento");
      return this.connectPromise;
    }

    // Se já existe uma instância de socket (desconectada), remove completamente
    if (this.socket) {
      console.warn("[Socket] ⚠️ Removendo instância de socket anterior");
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    console.info(
      `[Socket] 🚀 Criando nova conexão -> url: ${SOCKET_URL}, deviceId: ${deviceId}, deviceName: ${deviceName}`
    );

    this.socket = io(SOCKET_URL, {
      auth: {
        token,
        deviceId,
        deviceName,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: this.maxReconnectAttempts,
      timeout: 10000,
      // Força autoConnect = true (padrão, mas deixamos explícito)
      autoConnect: true,
    });

    console.info(
      "[Socket] 📡 Instância socket.io criada, configurando handlers..."
    );

    this.setupEventHandlers();
    // Tenta anexar listeners de baixo nível (engine / transport) para capturar closes/erros do WebSocket nativo
    this.attachEngineDebug();

    console.info("[Socket] 🔌 Aguardando conexão...");

    this.connectPromise = new Promise<void>((resolve, reject) => {
      if (!this.socket) {
        console.error("[Socket] ❌ Socket não inicializado após criação");
        return reject(new Error("Socket not initialized"));
      }

      const onConnect = () => {
        console.log("[Socket] ✅ Conexão estabelecida com sucesso!");
        cleanup();
        resolve();
      };

      const onConnectError = (err: Error) => {
        console.error("[Socket] ❌ Erro de conexão:", err);
        console.error(
          "[Socket] ❌ Tipo do erro:",
          typeof err,
          err.constructor.name
        );
        cleanup();
        reject(err);
      };

      const timer = setTimeout(() => {
        console.error(
          `[Socket] ❌ Timeout após ${timeoutMs}ms - conexão não estabelecida`
        );
        cleanup();
        reject(new Error("Socket connection timeout"));
      }, timeoutMs);

      const cleanup = () => {
        if (!this.socket) return;
        this.socket.off("connect", onConnect);
        this.socket.off("connect_error", onConnectError);
        clearTimeout(timer);
        this.connectPromise = null;
        console.info("[Socket] 🧹 Cleanup de promise concluído");
      };

      this.socket.once("connect", onConnect);
      this.socket.once("connect_error", onConnectError);
    });

    return this.connectPromise;
  }

  /**
   * Configura event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) {
      console.error("[Socket] ❌ Tentativa de configurar handlers sem socket");
      return;
    }

    console.info("[Socket] 📋 Configurando event handlers...");

    // Conexão estabelecida
    this.socket.on("connect", () => {
      console.log("[Socket] ✅ [EVENT] connect - Conectado ao servidor");
      console.log("[Socket] Socket ID:", this.socket?.id);
      this.reconnectAttempts = 0;
    });

    // Erro de conexão
    this.socket.on("connect_error", (error) => {
      // Exibe o objeto inteiro para facilitar debug (mas não expõe token)
      console.error("[Socket] ❌ [EVENT] connect_error:", error);
      console.error("[Socket] ❌ Detalhes:", {
        message: error.message,
        type: error.constructor.name,
        // @ts-expect-error - Acesso a propriedades extras
        description: error.description,
        // @ts-expect-error - Acesso a propriedades extras
        context: error.context,
      });
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error("[Socket] ❌ Máximo de tentativas de reconexão atingido");
        this.disconnect();
      }
    });

    // Evento de dispositivo revogado
    this.socket.on(
      "device-revoked",
      (data: { deviceId?: string; deviceName?: string; message: string }) => {
        const currentDeviceId = getDeviceId();

        console.warn("[Socket] Dispositivo revogado:", data);

        // Verifica se é o dispositivo atual (comparação apenas por deviceId)
        if (
          data.deviceId &&
          currentDeviceId &&
          data.deviceId === currentDeviceId
        ) {
          this.handleDeviceRevoked(data.message);
        }
      }
    );

    // Pong (resposta ao ping)
    this.socket.on("pong", () => {
      console.log("[Socket] Pong recebido");
    });

    // Eventos adicionais para ajudar no debug de reconexão e erros
    this.socket.on("error", (err) => {
      console.error("[Socket] socket error:", err);
    });

    this.socket.on("reconnect_attempt", (attempt) => {
      console.info("[Socket] reconnect_attempt ->", attempt);
    });

    this.socket.on("reconnect_error", (err) => {
      console.error("[Socket] reconnect_error ->", err);
    });

    this.socket.on("reconnect_failed", () => {
      console.error("[Socket] reconnect_failed");
    });

    this.socket.on("reconnect", (attempt) => {
      console.info("[Socket] reconnect successful after attempts ->", attempt);
    });

    // Desconexão
    this.socket.on("disconnect", (reason) => {
      console.log("[Socket] ⚠️ [EVENT] disconnect - Desconectado:", reason);
      console.log("[Socket] Detalhes da desconexão:", {
        reason,
        wasConnected: this.socket?.connected,
        socketId: this.socket?.id,
      });
    });

    console.info("[Socket] ✅ Event handlers configurados com sucesso");
  }

  /**
   * Anexa listeners de debug no engine/transport subjacente do socket.io-client
   * para capturar eventos do WebSocket nativo como 'close' e 'error'.
   */
  private attachEngineDebug(): void {
    if (!this.socket) {
      console.warn("[Socket] ⚠️ attachEngineDebug: socket não disponível");
      return;
    }

    console.info("[Socket] 🔍 Tentando anexar engine debug listeners...");

    try {
      const ioObj = (this.socket as unknown as { io?: { engine?: EngineLike } })
        .io;
      if (!ioObj) {
        console.debug(
          "[Socket] ⚠️ engine não disponível ainda (io undefined) - será anexado após conexão"
        );
        // Tenta novamente após um delay (quando o engine já estiver criado)
        setTimeout(() => {
          console.debug(
            "[Socket] 🔄 Tentando anexar engine debug novamente..."
          );
          this.attachEngineDebug();
        }, 100);
        return;
      }

      const engine = ioObj.engine as EngineLike | undefined;
      if (!engine || typeof engine.on !== "function") {
        console.debug("[Socket] ⚠️ engine não disponível ou sem método 'on'");
        return;
      }

      console.info("[Socket] ✅ Engine disponível, anexando listeners...");

      // Eventos de engine (abertura/fechamento/packet/upgrade)
      engine.on!("open", () => console.info("[Socket] 🟢 [ENGINE] open"));
      engine.on!("close", (reason: unknown) =>
        console.error("[Socket] 🔴 [ENGINE] close ->", reason)
      );
      engine.on!("packet", (packet: unknown) =>
        console.debug("[Socket] 📦 [ENGINE] packet ->", packet)
      );
      engine.on!("packetCreate", (packet: unknown) =>
        console.debug("[Socket] 📤 [ENGINE] packetCreate ->", packet)
      );
      engine.on!("upgrade", () =>
        console.info("[Socket] ⬆️ [ENGINE] upgraded")
      );
      engine.on!("upgrading", (transport: unknown) =>
        console.info("[Socket] 🔄 [ENGINE] upgrading to ->", transport)
      );
      engine.on!("error", (err: unknown) =>
        console.error("[Socket] ❌ [ENGINE] error ->", err)
      );

      // Transporte atual (p.ex. websocket) - tenta anexar listeners no transport
      const transport = engine.transport as TransportLike | undefined;
      if (transport && typeof transport.on === "function") {
        console.info("[Socket] 🚚 Transport disponível, anexando listeners...");
        transport.on!("close", (reason: unknown) =>
          console.error("[Socket] 🔴 [TRANSPORT] close ->", reason)
        );
        transport.on!("error", (err: unknown) =>
          console.error("[Socket] ❌ [TRANSPORT] error ->", err)
        );

        // Se existir objeto ws (WebSocket nativo no browser), anexa listeners
        const ws = transport.ws as
          | {
              addEventListener?: (
                event: string,
                listener: (ev: unknown) => void
              ) => void;
              readyState?: number;
            }
          | undefined;
        if (ws && typeof ws.addEventListener === "function") {
          console.info(
            "[Socket] 🌐 WebSocket nativo disponível, anexando listeners..."
          );
          console.info("[Socket] WebSocket readyState:", ws.readyState);
          try {
            ws.addEventListener("open", (ev: unknown) =>
              console.info("[Socket] 🟢 [WEBSOCKET] open ->", ev)
            );
            ws.addEventListener("close", (ev: unknown) =>
              console.error("[Socket] 🔴 [WEBSOCKET] close ->", ev)
            );
            ws.addEventListener("error", (ev: unknown) =>
              console.error("[Socket] ❌ [WEBSOCKET] error ->", ev)
            );
            ws.addEventListener("message", (ev: unknown) =>
              console.debug("[Socket] 📨 [WEBSOCKET] message ->", ev)
            );
          } catch (e) {
            console.warn(
              "[Socket] ⚠️ Failed to attach native WebSocket listeners ->",
              e
            );
          }
        }
      }

      console.info("[Socket] ✅ Engine debug listeners anexados com sucesso");
    } catch (e) {
      console.warn(
        "[Socket] ⚠️ Failed to attach engine debug handlers ->",
        (e as Error).message || e
      );
    }
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
