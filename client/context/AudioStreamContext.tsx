import React, { createContext, useContext, useReducer, useCallback, useEffect, ReactNode } from 'react';
import { WebSocketManager } from '../services/WebSocketManager';
import { audioStreamService, AudioStreamService } from '../services/AudioStreamService';

export type AudioStreamStage = 'idle' | 'recording' | 'transcribing' | 'generating' | 'playing' | 'error';

export interface AudioStreamState {
  // Connection state
  isConnected: boolean;
  connectionError: string | null;

  // Recording state
  isRecording: boolean;
  recordingDuration: number;

  // Processing state
  isProcessing: boolean;
  stage: AudioStreamStage;

  // Content state
  transcript: string;
  llmResponse: string;
  llmChunks: string[];

  // Playback state
  isPlaying: boolean;

  // Session
  currentSessionId: string | null;

  // Error
  error: string | null;
}

interface AudioStreamAction {
  type: string;
  payload?: any;
}

const initialState: AudioStreamState = {
  isConnected: false,
  connectionError: null,
  isRecording: false,
  recordingDuration: 0,
  isProcessing: false,
  stage: 'idle',
  transcript: '',
  llmResponse: '',
  llmChunks: [],
  isPlaying: false,
  currentSessionId: null,
  error: null,
};

function reducer(state: AudioStreamState, action: AudioStreamAction): AudioStreamState {
  switch (action.type) {
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload, connectionError: null };

    case 'SET_CONNECTION_ERROR':
      return { ...state, isConnected: false, connectionError: action.payload };

    case 'START_RECORDING':
      return {
        ...state,
        isRecording: true,
        stage: 'recording',
        recordingDuration: 0,
        transcript: '',
        llmResponse: '',
        llmChunks: [],
        error: null,
      };

    case 'STOP_RECORDING':
      return { ...state, isRecording: false, stage: 'transcribing' };

    case 'SET_PROCESSING':
      return { ...state, isProcessing: true, stage: action.payload };

    case 'SET_TRANSCRIPT':
      return { ...state, transcript: action.payload, stage: 'generating' };

    case 'APPEND_LLM_CHUNK':
      return {
        ...state,
        llmResponse: state.llmResponse + action.payload,
        llmChunks: [...state.llmChunks, action.payload],
      };

    case 'SET_LLM_COMPLETE':
      return { ...state, stage: 'playing' };

    case 'START_PLAYING':
      return { ...state, isPlaying: true, stage: 'playing' };

    case 'STOP_PLAYING':
      return { ...state, isPlaying: false, stage: 'idle' };

    case 'SET_SESSION_ID':
      return { ...state, currentSessionId: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, stage: 'error' };

    case 'RESET':
      return { ...initialState, isConnected: state.isConnected };

    default:
      return state;
  }
}

interface AudioStreamContextType {
  state: AudioStreamState;
  dispatch: React.Dispatch<AudioStreamAction>;
  wsManager: WebSocketManager | null;
  audioService: AudioStreamService;
}

const AudioStreamContext = createContext<AudioStreamContextType | undefined>(undefined);

interface AudioStreamProviderProps {
  wsUrl: string;
  children: ReactNode;
}

export function AudioStreamProvider({ wsUrl, children }: AudioStreamProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [wsManager] = React.useState(() => new WebSocketManager(wsUrl));

  useEffect(() => {
    // Connect WebSocket
    wsManager.connect().catch((error) => {
      console.error('[AudioStreamProvider] Connection error:', error);
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: String(error) });
    });

    wsManager.on('connected', () => {
      console.log('[AudioStreamProvider] Connected');
      dispatch({ type: 'SET_CONNECTED', payload: true });
    });

    wsManager.on('disconnected', () => {
      console.log('[AudioStreamProvider] Disconnected');
      dispatch({ type: 'SET_CONNECTED', payload: false });
    });

    wsManager.on('error', (error: any) => {
      console.error('[AudioStreamProvider] WebSocket error:', error);
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: String(error) });
    });

    // Clean up on unmount
    return () => {
      wsManager.disconnect();
    };
  }, [wsManager]);

  return (
    <AudioStreamContext.Provider value={{ state, dispatch, wsManager, audioService: audioStreamService }}>
      {children}
    </AudioStreamContext.Provider>
  );
}

export function useAudioStreamContext(): AudioStreamContextType {
  const context = useContext(AudioStreamContext);
  if (!context) {
    throw new Error('useAudioStreamContext must be used within AudioStreamProvider');
  }
  return context;
}
