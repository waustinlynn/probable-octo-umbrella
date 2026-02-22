# Audio Streaming with AI Response - Complete Setup Guide

This guide walks you through setting up and testing the complete bidirectional audio streaming system with OpenAI integration (Whisper → GPT-4 → TTS).

## What You'll Be Able to Do

Record audio → Server transcribes with Whisper → GPT-4 generates response → TTS converts to audio → Client plays response

**Target performance: 3-5 seconds from stop recording to hearing response**

## Prerequisites

- Node.js 18+ installed
- OpenAI API key (get one at https://platform.openai.com/api-keys)
- For testing on physical device: WiFi network
- npm installed

## Quick Setup (5 minutes)

### Step 1: Setup Server

```bash
# 1. Create .env file in server directory
cd server
cp .env.example .env

# Edit .env and add your OpenAI API key
# OPENAI_API_KEY=sk-...

# 2. Install and start server
npm install  # Already done, but ensure latest
npm run dev

# You should see:
# HTTP Server running at http://0.0.0.0:3000
# WebSocket Server started on port 8080
```

### Step 2: Setup Client

```bash
# In a new terminal
cd language

# 1. Create .env file (optional, defaults work for local testing)
cp .env.example .env

# 2. Start the client
npm start

# Press 'a' for Android or 'i' for iOS
# OR scan QR code with Expo Go app
```

### Step 3: Test the Flow

1. **Open app** - You should see "🎙 Voice AI Chat" screen
2. **Check connection status** - Should say "connected" (check logs if not)
3. **Tap "Start Recording"** button
4. **Say something** - Try: "What is the capital of France?"
5. **Tap "Stop Recording"** button
6. **Watch the magic**:
   - "📝 Transcribing audio..." → You see your transcript
   - "✨ Generating response..." → AI response appears as text
   - "🔊 Playing response..." → You hear the audio response

**Total time: 3-5 seconds!**

## Architecture

### Server Components

| File | Purpose |
|------|---------|
| `src/config/config.ts` | Configuration management |
| `src/session/Session.ts` | Individual session data |
| `src/session/SessionManager.ts` | Session lifecycle management |
| `src/services/OpenAIService.ts` | OpenAI APIs (Whisper, GPT-4, TTS) |
| `src/websocket/WebSocketServer.ts` | WebSocket server |
| `src/websocket/MessageHandler.ts` | Message routing and processing |
| `src/index.ts` | Server startup |

### Client Components

| File | Purpose |
|------|---------|
| `services/WebSocketManager.ts` | WebSocket connection management |
| `services/AudioStreamService.ts` | Audio recording and playback |
| `context/AudioStreamContext.tsx` | Global state management |
| `hooks/useAudioStream.ts` | Audio streaming logic |
| `components/StreamingButton.tsx` | UI component |

## Message Flow

### 1. Session Initialization

```
Client                          Server
  |                               |
  |---- session.start ----------->|
  |                       [Creates new session]
  |<---- session.ready ----------|
```

### 2. Audio Recording & Transmission

```
Client: Records audio
  |
  |---- audio.chunk ----------->| [buffers audio]
  |<---- audio.received --------|
  |
  |---- audio.end ----------->| [triggers processing]
```

### 3. Speech-to-Text

```
Server: Receives audio.end
  |
  |-->[ Whisper API ]
  |
  |<---- transcript.complete ---- Client
         displays transcript
```

### 4. LLM Generation

```
Server: Receives transcript
  |
  |-->[ GPT-4 Streaming ]
  |
  |<---- llm.chunk -----------> Client [updates text in real-time]
  |<---- llm.chunk -----------> Client [more text...]
  |<---- llm.complete -------> Client
```

### 5. Text-to-Speech

```
Server: GPT-4 complete
  |
  |-->[ OpenAI TTS ]
  |
  |<---- audio.chunk ---------> Client [buffers audio]
  |<---- audio.chunk ---------> Client [more audio...]
  |<---- audio.complete -----> Client [starts playback]
```

## Configuration

### Server .env

```bash
# Server ports
HTTP_PORT=3000
WS_PORT=8080

# OpenAI API
OPENAI_API_KEY=sk-...

# Model choices
GPT_MODEL=gpt-4-turbo-preview  # or gpt-3.5-turbo for faster/cheaper
TTS_VOICE=alloy               # or: echo, fable, onyx, nova, shimmer

# Limits
MAX_CONCURRENT_SESSIONS=100
SESSION_EXPIRATION=3600000
```

### Client .env

```bash
# Development (local machine)
EXPO_PUBLIC_WS_URL=ws://localhost:8080

# Production (remote server)
# EXPO_PUBLIC_WS_URL=wss://your-api.example.com
```

## Testing Different Scenarios

### Quick Test
```
Say: "Hello"
Expected response: "Hi there! How can I help?" (in 3-4 seconds)
```

### Reasoning Test
```
Say: "What's 25 times 4?"
Expected: Math answer read aloud
```

### Conversation Test
```
Record multiple messages in sequence
Each should get independent response
```

### Error Handling Test
```
1. Disconnect WiFi during recording → See "Connection lost. Retrying..."
2. Deny microphone permission → See permission error
3. Invalid API key in .env → See "Service unavailable" error
```

## Troubleshooting

### "Connection refused" or "Cannot connect to server"

1. **Check server is running**:
   ```bash
   cd server && npm run dev
   # Should show: WebSocket Server started on port 8080
   ```

2. **Check WebSocket URL**:
   - For local machine: `ws://localhost:8080` ✓
   - For physical device on same WiFi: `ws://YOUR_COMPUTER_IP:8080`
   - Find IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)

3. **Update client .env if needed**:
   ```bash
   EXPO_PUBLIC_WS_URL=ws://192.168.1.100:8080
   ```

### "No response from server" or "Transcription failed"

1. **Check OpenAI API key**:
   ```bash
   # In server/.env, verify:
   OPENAI_API_KEY=sk-...
   # If missing, add your actual key
   ```

2. **Check server logs**:
   Look for error messages in server terminal
   Should show: `[OpenAIService] Transcribing audio...`

3. **Verify internet connection**:
   Server needs to reach OpenAI API

### "Audio won't play"

1. **Check device volume** - Unmute and increase volume
2. **Check audio mode** - Some devices default to silent mode
3. **Check TTS response** - Look at server logs for TTS errors

### App crashes on recording

1. **Grant microphone permission**:
   - iOS: Settings > Privacy > Microphone
   - Android: Grant when prompted

2. **Check expo-av setup** - Run `npx expo doctor`

## Performance Monitoring

### Server Side

Watch the server logs for performance data:

```
[MessageHandler] Received message: audio.end
[OpenAIService] Transcribing audio...
[OpenAIService] Transcription complete: "What is AI?"
[OpenAIService] Starting GPT stream for transcript: "What is AI?"
[OpenAIService] GPT chunk: "AI stands"
[OpenAIService] GPT chunk: " for Artificial"
...
[OpenAIService] GPT stream complete
[OpenAIService] Generating speech for: "AI stands for Artificial Intelligence..."
[OpenAIService] Speech synthesis complete: 45000 bytes
```

### Expected Timings

- **Whisper**: 0.5-1s for 3-5s audio
- **GPT-4 first token**: 0.3-0.5s
- **GPT-4 full response**: 1-2s for 2-3 sentences
- **TTS generation**: 1-2s for typical response
- **Total**: 3-5 seconds

### If It's Slower

1. **Check internet speed** - Slower = longer API calls
2. **Try GPT-3.5-turbo** - Faster but slightly less smart
3. **Shorten responses** - System prompt limits max_tokens
4. **Check OpenAI load** - May be busy (rare)

## Advanced Configuration

### Faster Responses (Trade-off: Less Accurate)

Edit `server/src/config/config.ts`:

```typescript
openai: {
  gpt: {
    model: 'gpt-3.5-turbo',  // Much faster
    maxTokens: 150,           // Shorter responses
  },
  tts: {
    model: 'tts-1',          // Real-time TTS
    speed: 1.5,              // 1.5x faster speech
  },
},
```

### Higher Quality (Trade-off: Slower)

```typescript
openai: {
  gpt: {
    model: 'gpt-4',          // More intelligent
    maxTokens: 500,          // Longer responses
  },
  tts: {
    model: 'tts-1-hd',       // Higher quality audio
    speed: 0.9,              // Slower, more natural
  },
},
```

### Change System Prompt

In `src/websocket/MessageHandler.ts`, update:

```typescript
{
  role: 'system',
  content: 'You are a helpful, concise assistant. Keep responses brief (2-3 sentences max).',
}
```

## Monitoring & Debugging

### Enable Debug Logs

In development, the app shows debug info in the UI:
- Connection status
- Current stage
- Session ID

### Check Network Traffic

- **iOS**: Xcode Network Link Conditioner to simulate slow networks
- **Android**: Android Studio Network Profiler
- **Web**: Browser DevTools Network tab

### Measure Performance

Check server terminal and look for timing between logs:

```
[OpenAIService] Transcription complete: ... (started 0.8s ago)
[OpenAIService] GPT chunk: ... (started 0.3s after transcription)
```

## Production Deployment

When ready to deploy:

1. **Get domain** and SSL certificate
2. **Update WebSocket URL**:
   ```bash
   EXPO_PUBLIC_WS_URL=wss://api.example.com
   # Note: Use wss:// (secure) for production
   ```

3. **Deploy server**:
   ```bash
   # Using Docker
   docker build -t audio-server .
   docker run -e OPENAI_API_KEY=sk-... audio-server
   ```

4. **Deploy client**:
   ```bash
   eas build --platform all
   eas submit --platform all
   ```

## Next Steps

Once you have the basic flow working:

1. **Add session history** - Store past conversations
2. **Add voice selection** - Let users choose TTS voice
3. **Add model selection** - Let users pick GPT-3.5 vs GPT-4
4. **Add conversation context** - Multi-turn conversations
5. **Add audio recording options** - Different sample rates/quality

## Support

If something isn't working:

1. Check server logs (most detailed info)
2. Check client logs (Xcode/Android Studio or browser console)
3. Verify .env files have correct values
4. Verify OpenAI API key is valid
5. Try with simpler audio (short, clear words)

Good luck! 🚀
