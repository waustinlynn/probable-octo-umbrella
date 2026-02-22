# Audio Streaming App Setup

This is a React Native audio streaming application with a Node.js gRPC/HTTP backend server.

## Architecture

- **Frontend**: React Native (Expo) app running on iOS, Android, or Web
- **Backend**: Node.js server with:
  - gRPC service for potential backend-to-backend communication
  - HTTP server for audio file uploads from mobile clients
  - File storage for recorded audio

## Project Structure

```
language/
├── language/                    # React Native app (Expo)
│   ├── app/                     # App screens and routing (expo-router)
│   ├── components/              # Reusable UI components
│   │   └── audio-stream-button.tsx  # Audio recording button
│   ├── services/                # Business logic
│   │   └── audioService.ts      # Audio recording & streaming service
│   └── package.json
│
└── server/                      # Node.js backend
    ├── src/
    │   └── index.ts             # Main server file (gRPC + HTTP)
    ├── proto/
    │   └── audio.proto          # gRPC service definition
    ├── uploads/                 # Uploaded audio files
    └── package.json
```

## Setup Instructions

### Server Setup

1. Navigate to server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm run dev
```

The server will start on:
- **HTTP Server**: `http://localhost:3000`
- **gRPC Server**: `localhost:50051`

Available HTTP endpoints:
- `GET /health` - Health check
- `POST /upload-audio` - Upload audio file (multipart/form-data with `sessionId` and `audioFile`)

### React Native App Setup

1. Navigate to app directory:
```bash
cd language
```

2. Install dependencies:
```bash
npm install
```

3. Start the app:

**For Expo Go (easiest)**:
```bash
npm start
# Then scan the QR code with Expo Go app on your phone
```

**For iOS**:
```bash
npm run ios
```

**For Android**:
```bash
npm run android
```

**For Web**:
```bash
npm run web
```

### Running Both Services

You'll need two terminal windows:

**Terminal 1 - Server**:
```bash
cd server
npm run dev
```

**Terminal 2 - React Native App**:
```bash
cd language
npm start
```

## Usage

1. Open the React Native app
2. Navigate to the home screen (audio streaming tab)
3. Tap the "Start Recording" button
4. Speak or play audio near the device
5. Tap "Stop Recording" to end the session
6. Audio will be automatically uploaded to the server

## How It Works

### Recording Flow

1. **User taps "Start Recording"**: `AudioStreamButton` component calls `audioService.startRecording()`
2. **Service initializes**: Audio permissions are requested, recording options are configured
3. **Recording starts**: Raw PCM audio is captured at 16kHz sample rate
4. **User taps "Stop Recording"**: Service stops recording and uploads the file

### Upload Flow

1. **Audio recorded**: WAV file is saved to the device's file system
2. **Upload initiated**: File is uploaded via HTTP POST to `/upload-audio`
3. **Server receives**: Express handler saves the file with session ID timestamp
4. **File stored**: Audio stored in `server/uploads/` directory

## Configuration

### Connecting to a Remote Server

By default, the app connects to `localhost:3000`. For testing on physical devices or a different server:

**In `language/app/(tabs)/index.tsx`**, update:
```typescript
const SERVER_URL = 'http://your-server-ip:3000'; // Change to your server IP
```

### Audio Recording Settings

In `language/services/audioService.ts`, you can adjust:
- **Sample rate**: Default 16000 Hz (change `sampleRate` config)
- **Channels**: Default 1 (mono)
- **Quality**: Configurable per platform in `RecordingOptions`

## Technology Stack

### Frontend
- **React Native 0.81.5**
- **Expo 54.0.31** (for easy deployment)
- **TypeScript 5.9**
- **React Navigation** (bottom tabs)
- **expo-av** (audio recording)

### Backend
- **Node.js/TypeScript**
- **gRPC** (@grpc/grpc-js) - for service-to-service communication
- **Express.js** - for HTTP endpoints
- **Multer** - for file uploads

## Next Steps

The current implementation covers:
- ✅ Audio recording from React Native device
- ✅ File upload to backend server
- ✅ File storage with session tracking

Future enhancements:
- Real-time streaming (chunked audio transport)
- Speech-to-text conversion
- Audio processing pipeline
- Session management and history
- Real-time bidirectional communication

## Troubleshooting

### "Audio permissions not granted"
- Grant microphone permissions in your device settings
- iOS: Check Settings > Privacy > Microphone
- Android: Check Settings > Apps > language > Permissions > Microphone

### "Connection refused" errors
- Ensure server is running on the correct port (3000)
- For physical devices: Use your computer's IP address instead of `localhost`
  - Windows: Run `ipconfig` and use the IPv4 address
  - macOS/Linux: Run `ifconfig` or `hostname -I`

### Audio file not uploading
- Check that the server is running
- Verify the `SERVER_URL` in the app matches your server address
- Check server logs for upload errors

## Architecture Notes

### Why Both gRPC and HTTP?

- **gRPC**: Defined in the proto file for potential backend-to-backend communication, real-time streaming optimizations, and future service scaling
- **HTTP with Multer**: Reliable, standard-based file upload mechanism that works well with Expo/React Native
- **Hybrid approach**: Allows for flexibility in scaling and adding additional services

### PCM Audio Format

- **Sample Rate**: 16kHz (standard for speech/audio processing)
- **Bit Depth**: 16-bit linear PCM
- **Channels**: Mono (1 channel)
- **Format**: WAV (with headers, easier for server processing)

This configuration is optimized for speech processing and transcription.
