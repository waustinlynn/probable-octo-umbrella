export const config = {
  server: {
    http: {
      port: parseInt(process.env.HTTP_PORT || '3000'),
    },
    websocket: {
      port: parseInt(process.env.WS_PORT || '8080'),
      pingInterval: 30000,
      maxConnections: 1000,
    },
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    whisper: {
      model: 'whisper-1',
      language: 'en',
    },
    gpt: {
      model: process.env.GPT_MODEL || 'gpt-4-turbo-preview',
      temperature: 0.7,
      maxTokens: 500,
    },
    tts: {
      model: 'tts-1',
      voice: (process.env.TTS_VOICE as any) || 'alloy',
      format: 'mp3',
      speed: 1.0,
    },
  },

  session: {
    maxDuration: 30000,
    expirationTime: 3600000,
    maxConcurrentSessions: 100,
  },

  audio: {
    sampleRate: 16000,
    channels: 1,
    chunkSize: 16384,
    chunkDuration: 100,
  },
};
