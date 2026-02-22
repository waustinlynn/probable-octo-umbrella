import { Session } from './Session';
import { config } from '../config/config';

export class SessionManager {
  private sessions = new Map<string, Session>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupInterval();
  }

  createSession(sessionId: string): Session {
    const session = new Session(sessionId);
    this.sessions.set(sessionId, session);
    console.log(`[SessionManager] Created session: ${sessionId}`);
    return session;
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  deleteSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.cleanup();
      this.sessions.delete(sessionId);
      console.log(`[SessionManager] Deleted session: ${sessionId}`);
    }
  }

  getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  getSessionCount(): number {
    return this.sessions.size;
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;

      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.isExpired(config.session.expirationTime)) {
          this.deleteSession(sessionId);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`[SessionManager] Cleaned up ${cleanedCount} expired sessions`);
      }
    }, 60000); // Run cleanup every minute
  }

  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Cleanup all remaining sessions
    for (const sessionId of this.sessions.keys()) {
      this.deleteSession(sessionId);
    }

    console.log('[SessionManager] Stopped');
  }
}
