import { useCallback, useEffect } from 'react';
import { useAudioStreamContext } from '../context/AudioStreamContext';

export function useAudioStream() {
  const { state, dispatch, wsManager, audioService } = useAudioStreamContext();

  // Initialize audio service on mount
  useEffect(() => {
    if (wsManager && state.isConnected) {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      dispatch({ type: 'SET_SESSION_ID', payload: sessionId });

      audioService.initialize({
        wsManager,
        sessionId,
      }).catch((error) => {
        console.error('[useAudioStream] Initialization failed:', error);
        dispatch({ type: 'SET_ERROR', payload: String(error) });
      });
    }
  }, [wsManager, state.isConnected, audioService, dispatch]);

  // Listen for WebSocket messages
  useEffect(() => {
    if (!wsManager) return;

    // Transcript received
    wsManager.on('transcript.complete', (message: any) => {
      console.log('[useAudioStream] Transcript received:', message.data.transcript);
      dispatch({ type: 'SET_TRANSCRIPT', payload: message.data.transcript });
    });

    // LLM chunks received
    wsManager.on('llm.chunk', (message: any) => {
      console.log('[useAudioStream] LLM chunk:', message.data.content);
      dispatch({ type: 'APPEND_LLM_CHUNK', payload: message.data.content });
    });

    // LLM complete
    wsManager.on('llm.complete', (message: any) => {
      console.log('[useAudioStream] LLM complete');
      dispatch({ type: 'SET_LLM_COMPLETE' });
    });

    // Audio chunks received - accumulate and play
    let audioChunks: string[] = [];
    wsManager.on('audio.chunk', (message: any) => {
      console.log('[useAudioStream] Audio chunk received');
      audioChunks.push(message.data.chunk);
    });

    // Audio complete - play accumulated audio
    wsManager.on('audio.complete', async (message: any) => {
      console.log('[useAudioStream] Audio complete, playing...');
      try {
        const fullAudio = audioChunks.join('');
        dispatch({ type: 'START_PLAYING' });
        await audioService.playAudio(fullAudio);
        dispatch({ type: 'STOP_PLAYING' });
        audioChunks = [];
      } catch (error) {
        console.error('[useAudioStream] Playback error:', error);
        dispatch({ type: 'SET_ERROR', payload: String(error) });
      }
    });

    // Error handling
    wsManager.on('error', (message: any) => {
      console.error('[useAudioStream] Server error:', message.data);
      dispatch({ type: 'SET_ERROR', payload: message.data.message });
    });

    return () => {
      wsManager.off('transcript.complete', () => {});
      wsManager.off('llm.chunk', () => {});
      wsManager.off('llm.complete', () => {});
      wsManager.off('audio.chunk', () => {});
      wsManager.off('audio.complete', () => {});
      wsManager.off('error', () => {});
    };
  }, [wsManager, audioService, dispatch]);

  const startRecording = useCallback(async () => {
    try {
      if (!state.currentSessionId) {
        throw new Error('No active session');
      }

      if (!wsManager?.isReady()) {
        throw new Error('Not connected to server');
      }

      // Notify server of session start
      wsManager.send({
        type: 'session.start',
        sessionId: state.currentSessionId,
        timestamp: Date.now(),
        data: { sampleRate: 16000, channels: 1 },
      });

      // Start recording
      dispatch({ type: 'START_RECORDING' });
      await audioService.startRecording();
    } catch (error) {
      console.error('[useAudioStream] Start recording failed:', error);
      dispatch({ type: 'SET_ERROR', payload: String(error) });
      throw error;
    }
  }, [state.currentSessionId, wsManager, audioService, dispatch]);

  const stopRecording = useCallback(async () => {
    try {
      dispatch({ type: 'STOP_RECORDING' });
      const result = await audioService.stopRecording();
      console.log('[useAudioStream] Recording stopped, duration:', result.duration);
    } catch (error) {
      console.error('[useAudioStream] Stop recording failed:', error);
      dispatch({ type: 'SET_ERROR', payload: String(error) });
      throw error;
    }
  }, [audioService, dispatch]);

  const cancelSession = useCallback(async () => {
    try {
      if (state.currentSessionId) {
        wsManager?.send({
          type: 'session.cancel',
          sessionId: state.currentSessionId,
          timestamp: Date.now(),
          data: {},
        });
      }
      dispatch({ type: 'RESET' });
      await audioService.cleanup();
    } catch (error) {
      console.error('[useAudioStream] Cancel session failed:', error);
    }
  }, [state.currentSessionId, wsManager, audioService, dispatch]);

  return {
    state,
    startRecording,
    stopRecording,
    cancelSession,
  };
}
