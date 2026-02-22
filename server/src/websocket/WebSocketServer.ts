import WebSocket, { WebSocketServer as WSServer } from 'ws';
import { SessionManager } from '../session/SessionManager';
import { MessageHandler } from './MessageHandler';
import { config } from '../config/config';

export class WebSocketServer {
  private wss: WSServer | null = null;
  private sessionManager: SessionManager;
  private messageHandler: MessageHandler;
  private port: number;
  private clientSessions = new Map<WebSocket, string>(); // Track which session each client belongs to

  constructor(port: number = config.server.websocket.port) {
    this.port = port;
    this.sessionManager = new SessionManager();
    this.messageHandler = new MessageHandler(this.sessionManager);
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WSServer({ port: this.port }, () => {
          console.log(`[WebSocketServer] Started on port ${this.port}`);
          resolve();
        });

        this.wss.on('connection', (ws: WebSocket) => {
          console.log('[WebSocketServer] Client connected');

          ws.on('message', async (data: WebSocket.Data) => {
            try {
              const message = JSON.parse(data.toString());
              const sessionId = message.sessionId;

              // Track this client's session
              if (sessionId) {
                this.clientSessions.set(ws, sessionId);
              }

              // Handle the message
              await this.messageHandler.handle(ws, message);
            } catch (error) {
              console.error('[WebSocketServer] Message handling error:', error);
              ws.send(JSON.stringify({
                type: 'error',
                data: {
                  code: 'MESSAGE_PARSE_ERROR',
                  message: 'Failed to process message',
                },
              }));
            }
          });

          ws.on('close', () => {
            const sessionId = this.clientSessions.get(ws);
            this.clientSessions.delete(ws);
            console.log('[WebSocketServer] Client disconnected', sessionId ? `(session: ${sessionId})` : '');
          });

          ws.on('error', (error: Error) => {
            console.error('[WebSocketServer] WebSocket error:', error);
          });

          // Send initial connection confirmation
          ws.send(JSON.stringify({
            type: 'connection.established',
            timestamp: Date.now(),
            data: { message: 'Connected to server' },
          }));
        });

        this.wss.on('error', (error: Error) => {
          console.error('[WebSocketServer] Server error:', error);
          reject(error);
        });
      } catch (error) {
        console.error('[WebSocketServer] Failed to start:', error);
        reject(error);
      }
    });
  }

  /**
   * Broadcast message to all clients in a session
   */
  broadcastToSession(sessionId: string, message: any): void {
    if (!this.wss) return;

    const messageStr = JSON.stringify(message);
    let count = 0;

    this.wss.clients.forEach((client: WebSocket) => {
      if (this.clientSessions.get(client) === sessionId && client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
        count++;
      }
    });

    console.log(`[WebSocketServer] Broadcasted to ${count} clients in session ${sessionId}`);
  }

  /**
   * Send message to a specific client
   */
  sendToClient(ws: WebSocket, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Get session manager for direct access if needed
   */
  getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  /**
   * Stop the server
   */
  stop(): void {
    if (this.wss) {
      this.wss.clients.forEach((client: WebSocket) => {
        client.close();
      });
      this.wss.close();
      this.sessionManager.stop();
      console.log('[WebSocketServer] Stopped');
    }
  }
}
