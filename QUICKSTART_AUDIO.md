# 🎙 Audio AI Chat - Quick Start (5 minutes)

## Prerequisites

- OpenAI API key (https://platform.openai.com/api-keys)
- Node.js 18+

## Setup & Run

### Terminal 1: Server

```bash
cd server

# Add your OpenAI API key to .env
echo "OPENAI_API_KEY=sk-your-key-here" > .env

# Start server
npm run dev

# Should output:
# HTTP Server running at http://0.0.0.0:3000
# WebSocket Server started on port 8080
```

### Terminal 2: Client

```bash
cd language

# Start app
npm start

# Then:
# - Press 'a' for Android Emulator
# - Press 'i' for iOS Simulator
# - OR scan QR code with Expo Go app
```

## Usage

1. **Wait for "connected"** - Check status in app
2. **Tap "Start Recording"**
3. **Say something**: "What's the capital of France?"
4. **Tap "Stop Recording"**
5. **Watch**:
   - Transcript appears (0.5-1s)
   - AI response streams (1-2s)
   - Audio plays (1-2s)
6. **Total: 3-5 seconds!**

## Configuration

### For Physical Device

Get your computer's IP:
```bash
# Windows
ipconfig

# Mac/Linux
ifconfig | grep "inet "
```

Update `language/.env`:
```bash
EXPO_PUBLIC_WS_URL=ws://192.168.X.X:8080
```

Then rebuild and scan QR code again.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot connect" | Check server is running, verify WebSocket URL |
| "Transcription failed" | Add OpenAI API key to server/.env |
| "No microphone access" | Grant permission in device settings |
| "Audio won't play" | Unmute device, check volume |

## What Happens Under the Hood

```
Your audio
    ↓
Server receives via WebSocket
    ↓
[OpenAI Whisper] → Transcription
    ↓
[OpenAI GPT-4] → Text response (streamed to client)
    ↓
[OpenAI TTS] → Audio response (streamed to client)
    ↓
Client plays audio automatically
```

All in **3-5 seconds**! 🚀

## Architecture Files

**Server:**
- `src/config/config.ts` - Settings
- `src/session/Session.ts` - Session data
- `src/services/OpenAIService.ts` - OpenAI APIs
- `src/websocket/WebSocketServer.ts` - Connection handling
- `src/websocket/MessageHandler.ts` - Message processing

**Client:**
- `services/WebSocketManager.ts` - Connection
- `services/AudioStreamService.ts` - Recording/playback
- `context/AudioStreamContext.tsx` - State
- `hooks/useAudioStream.ts` - Logic
- `components/StreamingButton.tsx` - UI

## Next Steps

See `AUDIO_STREAMING_SETUP.md` for:
- Detailed configuration
- Advanced settings
- Performance tuning
- Deployment guide

Good luck! 🎉
