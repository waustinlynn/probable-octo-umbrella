import { EventEmitter } from 'events';

interface WebSocketMessage {
  type: string;
  sessionId: string;
  timestamp: number;
  data: any;
}

export class WebSocketManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private messageQueue: WebSocketMessage[] = [];
  private isConnected = false;

  constructor(url: string) {
    super();
    this.url = url;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log('[WebSocketManager] Connecting to', this.url);

        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('[WebSocketManager] Connected');
          this.reconnectAttempts = 0;
          this.isConnected = true;

          // Send queued messages
          this.flushMessageQueue();

          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('[WebSocketManager] Received:', message.type);
            this.emit(message.type, message);
            this.emit('message', message);
          } catch (error) {
            console.error('[WebSocketManager] Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error: any) => {
          console.error('[WebSocketManager] WebSocket error:', error);
          this.isConnected = false;
          this.emit('error', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[WebSocketManager] Disconnected');
          this.isConnected = false;
          this.emit('disconnected');
          this.attemptReconnect();
        };
      } catch (error) {
        console.error('[WebSocketManager] Connection failed:', error);
        this.isConnected = false;
        reject(error);
      }
    });
  }

  send(message: WebSocketMessage): boolean {
    if (!this.ws) {
      this.messageQueue.push(message);
      return false;
    }

    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      console.log('[WebSocketManager] Sent:', message.type);
      return true;
    } else {
      this.messageQueue.push(message);
      return false;
    }
  }

  private flushMessageQueue(): void {
    console.log('[WebSocketManager] Flushing queue with', this.messageQueue.length, 'messages');
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000;
      console.log(
        `[WebSocketManager] Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} after ${delay}ms`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));

      try {
        await this.connect();
      } catch (error) {
        console.error('[WebSocketManager] Reconnection failed:', error);
        this.emit('reconnection-failed', error);
      }
    } else {
      console.error('[WebSocketManager] Max reconnection attempts reached');
      this.emit('permanently-disconnected');
    }
  }

  isReady(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  disconnect(): void {
    if (this.ws) {
      this.isConnected = false;
      this.ws.close();
      this.ws = null;
    }
  }

  on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  once(event: string, listener: (...args: any[]) => void): this {
    return super.once(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void): this {
    return super.off(event, listener);
  }
}
