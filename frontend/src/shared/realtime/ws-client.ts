import { refreshAccessToken } from "../api/client";
import { getAccessToken } from "../lib/token";

export type AppSocketEvent = {
  type?: string;
  chat_id?: string;
  chat_type?: "direct" | "group";
  message?: string;
  payload?: unknown;
  [key: string]: unknown;
};

type EventHandler = (event: AppSocketEvent) => void;
type StatusHandler = (isConnected: boolean) => void;

class AppWebSocketClient {
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;

  private eventHandlers = new Set<EventHandler>();
  private statusHandlers = new Set<StatusHandler>();

  private shouldReconnect = false;
  private connectionVersion = 0;
  private reconnectDelayMs = 3000;
  private isRefreshingToken = false;

  connect() {
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const token = getAccessToken();

    if (!token) {
      this.emitStatus(false);
      return;
    }

    this.clearReconnectTimer();

    this.shouldReconnect = true;
    this.connectionVersion += 1;

    const currentVersion = this.connectionVersion;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.host;
    const wsUrl = `${protocol}://${host}/ws/app/?token=${encodeURIComponent(token)}`;

    const socket = new WebSocket(wsUrl);
    this.socket = socket;

    socket.onopen = () => {
      if (currentVersion !== this.connectionVersion) return;
      this.emitStatus(true);
    };

    socket.onmessage = async (event) => {
      if (currentVersion !== this.connectionVersion) return;

      try {
        const data = JSON.parse(event.data) as AppSocketEvent;

        if (data.type === "auth.error") {
          await this.handleAuthError(currentVersion);
          return;
        }

        this.emitEvent(data);
      } catch {
        console.error("Failed to process WebSocket event");
      }
    };

    socket.onerror = () => {
      socket.close();
    };

    socket.onclose = async (event) => {
      if (currentVersion !== this.connectionVersion) return;

      this.emitStatus(false);

      if (this.socket === socket) {
        this.socket = null;
      }

      if (!this.shouldReconnect) {
        return;
      }

      if (event.code === 4001) {
        await this.handleAuthError(currentVersion);
        return;
      }

      this.scheduleReconnect(currentVersion);
    };
  }

  disconnect() {
    this.shouldReconnect = false;
    this.connectionVersion += 1;
    this.clearReconnectTimer();

    if (this.socket) {
      const socket = this.socket;
      this.socket = null;

      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;

      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    }

    this.emitStatus(false);
  }

  send(data: unknown) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    this.socket.send(JSON.stringify(data));
    return true;
  }

  openChat(chatId: string) {
    return this.send({
      type: "chat.open",
      chat_id: chatId,
    });
  }

  openDirectChat(recipientId: number) {
    return this.send({
      type: "chat.open",
      recipient_id: recipientId,
    });
  }

  openGroupChat(chatId: string) {
    return this.openChat(chatId);
  }

  closeActiveChat() {
    return this.send({
      type: "chat.close",
    });
  }

  sendMessage(text: string, clientId: string) {
    return this.send({
      type: "message.send",
      payload: {
        client_id: clientId,
        text,
      },
    });
  }

  markMessagesRead(chatId: string, position: number) {
    return this.send({
      type: "message.read",
      chat_id: chatId,
      position,
    });
  }

  onEvent(handler: EventHandler) {
    this.eventHandlers.add(handler);

    return () => {
      this.eventHandlers.delete(handler);
    };
  }

  onStatusChange(handler: StatusHandler) {
    this.statusHandlers.add(handler);

    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  private async handleAuthError(version: number) {
    if (this.isRefreshingToken) return;

    this.isRefreshingToken = true;

    try {
      const refreshedToken = await refreshAccessToken();

      if (!refreshedToken) {
        this.shouldReconnect = false;
        this.disconnect();
        return;
      }

      if (version !== this.connectionVersion) return;

      this.forceReconnect();
    } finally {
      this.isRefreshingToken = false;
    }
  }

  private forceReconnect() {
    this.clearReconnectTimer();

    if (this.socket) {
      const socket = this.socket;
      this.socket = null;

      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;

      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    }

    this.connect();
  }

  private scheduleReconnect(version: number) {
    this.clearReconnectTimer();

    this.reconnectTimer = window.setTimeout(() => {
      if (!this.shouldReconnect) return;
      if (version !== this.connectionVersion) return;

      this.connect();
    }, this.reconnectDelayMs);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private emitEvent(event: AppSocketEvent) {
    this.eventHandlers.forEach((handler) => handler(event));
  }

  private emitStatus(isConnected: boolean) {
    this.statusHandlers.forEach((handler) => handler(isConnected));
  }
}

export const appWebSocketClient = new AppWebSocketClient();
