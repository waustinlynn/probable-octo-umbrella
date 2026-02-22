import WebSocket from 'ws';
import { SessionManager } from '../session/SessionManager';
import { OpenAIService } from '../services/OpenAIService';
import { Session } from '../session/Session';

interface WebSocketMessage {
  type: string;
  sessionId: string;
  timestamp: number;
  data: any;
}

export class MessageHandler {
  private sessionManager: SessionManager;
  private openaiService: OpenAIService;

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
    this.openaiService = new OpenAIService();
  }

  async handle(ws: WebSocket, message: WebSocketMessage): Promise<void> {
    console.log('[MessageHandler] Received message:', message.type, 'sessionId:', message.sessionId);

    try {
      switch (message.type) {
        case 'session.start':
          this.handleSessionStart(ws, message);
          break;

        case 'audio.chunk':
          this.handleAudioChunk(ws, message);
          break;

        case 'audio.end':
          await this.handleAudioEnd(ws, message);
          break;

        case 'session.cancel':
          this.handleSessionCancel(ws, message);
          break;

        default:
          console.warn('[MessageHandler] Unknown message type:', message.type);
          ws.send(JSON.stringify({
            type: 'error',
            sessionId: message.sessionId,
            timestamp: Date.now(),
            data: {
              code: 'UNKNOWN_MESSAGE_TYPE',
              message: `Unknown message type: ${message.type}`,
            },
          }));
      }
    } catch (error) {
      console.error('[MessageHandler] Error handling message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        sessionId: message.sessionId,
        timestamp: Date.now(),
        data: {
          code: 'HANDLER_ERROR',
          message: 'Error processing message',
          error: String(error),
        },
      }));
    }
  }

  private handleSessionStart(ws: WebSocket, message: WebSocketMessage): void {
    const { sessionId, data } = message;

    // Create new session
    const session = this.sessionManager.createSession(sessionId);

    // Send ready confirmation
    ws.send(JSON.stringify({
      type: 'session.ready',
      sessionId,
      timestamp: Date.now(),
      data: {
        status: 'ready',
        config: {
          maxAudioDuration: 30000,
          chunkSize: 16384,
        },
      },
    }));

    console.log('[MessageHandler] Session started:', sessionId);
  }

  private handleAudioChunk(ws: WebSocket, message: WebSocketMessage): void {
    const { sessionId, data } = message;
    const session = this.sessionManager.getSession(sessionId);

    if (!session) {
      ws.send(JSON.stringify({
        type: 'error',
        sessionId,
        timestamp: Date.now(),
        data: {
          code: 'SESSION_NOT_FOUND',
          message: `Session ${sessionId} not found`,
        },
      }));
      return;
    }

    try {
      // Add audio chunk to session
      session.addAudioChunk(data.chunk);

      // Send acknowledgment
      ws.send(JSON.stringify({
        type: 'audio.received',
        sessionId,
        timestamp: Date.now(),
        data: {
          sequenceNumber: data.sequenceNumber,
          message: `Received chunk ${data.sequenceNumber}`,
        },
      }));

      console.log(`[MessageHandler] Audio chunk received for session ${sessionId}: ${data.chunk.length} bytes`);
    } catch (error) {
      console.error('[MessageHandler] Error adding audio chunk:', error);
      ws.send(JSON.stringify({
        type: 'error',
        sessionId,
        timestamp: Date.now(),
        data: {
          code: 'AUDIO_CHUNK_ERROR',
          message: 'Failed to process audio chunk',
        },
      }));
    }
  }

  private async handleAudioEnd(ws: WebSocket, message: WebSocketMessage): Promise<void> {
    const { sessionId } = message;
    const session = this.sessionManager.getSession(sessionId);

    if (!session) {
      ws.send(JSON.stringify({
        type: 'error',
        sessionId,
        timestamp: Date.now(),
        data: {
          code: 'SESSION_NOT_FOUND',
          message: `Session ${sessionId} not found`,
        },
      }));
      return;
    }

    try {
      console.log(`[MessageHandler] Audio ended for session ${sessionId}, processing...`);
      session.setState('processing');

      // Get the audio buffer
      const audioBuffer = session.getAudioBuffer();
      console.log(`[MessageHandler] Total audio: ${audioBuffer.length} bytes`);

      // Step 1: Transcribe audio
      const transcript = await this.openaiService.transcribe(audioBuffer);
      session.setTranscript(transcript);

      // Send transcript to client
      ws.send(JSON.stringify({
        type: 'transcript.complete',
        sessionId,
        timestamp: Date.now(),
        data: {
          transcript,
          language: 'en',
        },
      }));

      console.log(`[MessageHandler] Transcript: ${transcript}`);

      // Step 2: Stream GPT response and collect full response
      let fullResponse = '';
      const gptChunkHandler = async () => {
        for await (const chunk of this.openaiService.streamCompletion(transcript)) {
          fullResponse += chunk;

          // Send text chunk to client for real-time display
          ws.send(JSON.stringify({
            type: 'llm.chunk',
            sessionId,
            timestamp: Date.now(),
            data: {
              content: chunk,
            },
          }));
        }

        // Send completion signal
        ws.send(JSON.stringify({
          type: 'llm.complete',
          sessionId,
          timestamp: Date.now(),
          data: {
            fullText: fullResponse,
          },
        }));

        // Step 3: Generate TTS audio from full response
        console.log(`[MessageHandler] Starting TTS for: ${fullResponse}`);
        const audioBuffer = await this.openaiService.synthesizeSpeech(fullResponse);

        // Send audio in chunks
        const chunkSize = 4096; // Send 4KB at a time
        for (let i = 0; i < audioBuffer.length; i += chunkSize) {
          const chunk = audioBuffer.slice(i, i + chunkSize);
          const base64Chunk = chunk.toString('base64');

          ws.send(JSON.stringify({
            type: 'audio.chunk',
            sessionId,
            timestamp: Date.now(),
            data: {
              chunk: base64Chunk,
              sequenceNumber: Math.floor(i / chunkSize),
            },
          }));
        }

        // Send completion signal
        ws.send(JSON.stringify({
          type: 'audio.complete',
          sessionId,
          timestamp: Date.now(),
          data: {
            totalSize: audioBuffer.length,
          },
        }));

        // Mark session as complete
        session.setState('complete');
        console.log(`[MessageHandler] Session ${sessionId} complete`);
      };

      // Start processing asynchronously
      gptChunkHandler().catch((error) => {
        console.error('[MessageHandler] Error processing response:', error);
        ws.send(JSON.stringify({
          type: 'error',
          sessionId,
          timestamp: Date.now(),
          data: {
            code: 'PROCESSING_ERROR',
            message: 'Error processing audio response',
          },
        }));
      });
    } catch (error) {
      console.error('[MessageHandler] Error in audio.end handler:', error);
      ws.send(JSON.stringify({
        type: 'error',
        sessionId,
        timestamp: Date.now(),
        data: {
          code: 'AUDIO_END_ERROR',
          message: 'Failed to process audio',
        },
      }));
    }
  }

  private handleSessionCancel(ws: WebSocket, message: WebSocketMessage): void {
    const { sessionId } = message;
    this.sessionManager.deleteSession(sessionId);

    ws.send(JSON.stringify({
      type: 'session.cancelled',
      sessionId,
      timestamp: Date.now(),
      data: {
        message: 'Session cancelled',
      },
    }));

    console.log('[MessageHandler] Session cancelled:', sessionId);
  }
}
