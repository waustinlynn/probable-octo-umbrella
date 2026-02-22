export type SessionState = 'recording' | 'processing' | 'complete' | 'error';

export class Session {
  public sessionId: string;
  public audioChunks: Buffer[] = [];
  public transcript: string = '';
  public llmResponse: string = '';
  public state: SessionState = 'recording';
  public createdAt: number = Date.now();
  public audioBuffer: Buffer | null = null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  addAudioChunk(chunk: Buffer | string): void {
    // If it's a base64 string, convert to buffer
    const buffer = typeof chunk === 'string'
      ? Buffer.from(chunk, 'base64')
      : chunk;
    this.audioChunks.push(buffer);
  }

  getAudioBuffer(): Buffer {
    if (!this.audioBuffer) {
      this.audioBuffer = Buffer.concat(this.audioChunks);
    }
    return this.audioBuffer;
  }

  setTranscript(transcript: string): void {
    this.transcript = transcript;
  }

  appendLlmResponse(chunk: string): void {
    this.llmResponse += chunk;
  }

  setState(state: SessionState): void {
    this.state = state;
  }

  cleanup(): void {
    this.audioChunks = [];
    this.audioBuffer = null;
  }

  isExpired(maxDuration: number): boolean {
    return Date.now() - this.createdAt > maxDuration;
  }

  getDuration(): number {
    return Date.now() - this.createdAt;
  }
}
