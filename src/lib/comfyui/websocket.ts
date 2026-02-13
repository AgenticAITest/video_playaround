"use client";

type EventCallback = (data: unknown) => void;

export interface ComfyUIProgress {
  value: number;
  max: number;
  promptId: string;
}

export interface ComfyUIExecuting {
  node: string | null;
  promptId: string;
}

export class ComfyUIWebSocket {
  private ws: WebSocket | null = null;
  private readonly clientId: string;
  private readonly serverUrl: string;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _connected = false;

  constructor(serverUrl: string) {
    this.clientId = crypto.randomUUID();
    this.serverUrl = serverUrl.replace(/^http/, "ws");
  }

  getClientId(): string {
    return this.clientId;
  }

  isConnected(): boolean {
    return this._connected;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    // Don't create duplicate connections while one is connecting
    if (this.ws?.readyState === WebSocket.CONNECTING) return;

    try {
      this.ws = new WebSocket(
        `${this.serverUrl}/ws?clientId=${this.clientId}`
      );

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this._connected = true;
        this.emit("connected", null);
      };

      this.ws.onmessage = (event) => {
        if (event.data instanceof Blob) {
          this.emit("preview", event.data);
          return;
        }

        try {
          const message = JSON.parse(event.data);
          const { type, data } = message;

          if (type) {
            this.emit(type, data);
          }
        } catch {
          // Ignore non-JSON messages
        }
      };

      this.ws.onclose = () => {
        this._connected = false;
        this.emit("disconnected", null);
        this.attemptReconnect();
      };

      this.ws.onerror = () => {
        this._connected = false;
        this.emit("error", { message: "WebSocket error" });
      };
    } catch {
      this._connected = false;
      this.attemptReconnect();
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts;
    this._connected = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach((cb) => cb(data));
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 10000);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /** Reset reconnect counter so connect() can try again */
  resetReconnect(): void {
    this.reconnectAttempts = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// Singleton per server URL
const instances = new Map<string, ComfyUIWebSocket>();

export function getComfyUIWebSocket(serverUrl: string): ComfyUIWebSocket {
  if (!instances.has(serverUrl)) {
    instances.set(serverUrl, new ComfyUIWebSocket(serverUrl));
  }
  return instances.get(serverUrl)!;
}
