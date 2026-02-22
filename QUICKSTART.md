# Quick Start Guide

Get the audio streaming app up and running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- Expo CLI (for running the React Native app): `npm install -g expo-cli`

## Step 1: Start the Backend Server

```bash
# Navigate to server directory
cd server

# Install dependencies (if not done yet)
npm install

# Start the development server
npm run dev
```

You should see output like:
```
HTTP Server running at http://0.0.0.0:3000
gRPC Server running at 0.0.0.0:50051
```

## Step 2: Start the React Native App

Open a **new terminal window** and:

```bash
# Navigate to app directory
cd language

# Install dependencies (if not done yet)
npm install

# Start the app
npm start
```

You should see:
```
Starting Expo...
```

## Step 3: Connect to the App

Choose one of the options:

### Option A: Use Expo Go (Fastest)
1. Download **Expo Go** app on your phone (iOS App Store or Google Play)
2. Scan the QR code shown in the terminal
3. App opens in Expo Go

### Option B: Run on Physical Device
1. Connect your device to the same WiFi as your computer
2. In terminal, press `i` (iOS) or `a` (Android)
3. Wait for the app to build and launch

### Option C: Run on Simulator/Emulator
1. Press `i` for iOS Simulator (macOS only)
2. Press `a` for Android Emulator
3. Wait for the app to build and launch

### Option D: Web Browser
1. Press `w` in the terminal
2. App opens in your default browser

## Step 4: Test Audio Recording

1. The app opens to the **Audio Streaming** tab
2. Tap the blue **"Start Recording"** button
3. Speak or make noise near your device
4. Tap the red **"Stop Recording"** button
5. Audio file is automatically uploaded to the server

## Verify Everything Works

### Check Server
- Open `http://localhost:3000/health` in your browser
- You should see: `{"status":"ok"}`

### Check Uploaded Files
- Look in `server/uploads/` directory
- You should see `.wav` files with names like `audio_session_xxxxx.wav`

### Check Server Logs
- The terminal running the server should show:
```
[Session session_xxx] Audio file uploaded: audio_session_xxx.wav
```

## Troubleshooting

### "Cannot find module" errors
```bash
# Clear npm cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Server won't start on port 3000
- Port is already in use. Change the port in `server/src/index.ts`:
  - Find: `const HTTP_PORT = 3000;`
  - Change to: `const HTTP_PORT = 3001;`
  - Update app accordingly in `language/app/(tabs)/index.tsx`

### App can't connect to server
- If testing on physical device, update the server URL in `language/app/(tabs)/index.tsx`:
  ```typescript
  const SERVER_URL = 'http://YOUR_COMPUTER_IP:3000';
  ```
- Find your IP: `ipconfig` (Windows) or `ifconfig` (macOS/Linux)

### Audio permissions denied
- iOS: Settings > Privacy > Microphone > Allow
- Android: Grant permission when prompted

## File Structure Created

```
language/
├── server/
│   ├── src/
│   │   └── index.ts          # Main server (gRPC + HTTP)
│   ├── proto/
│   │   └── audio.proto       # gRPC definitions
│   ├── uploads/              # Your audio files here ✓
│   ├── dist/                 # Compiled JavaScript
│   └── package.json
│
└── language/
    ├── components/
    │   └── audio-stream-button.tsx  # Recording UI ✓
    ├── services/
    │   └── audioService.ts          # Recording logic ✓
    ├── app/
    │   └── (tabs)/
    │       └── index.tsx            # Updated home screen ✓
    └── package.json
```

## Next: Customization

### Change Server Address
**File**: `language/app/(tabs)/index.tsx`
```typescript
const SERVER_URL = 'http://your-server.com:3000';
```

### Change Audio Quality
**File**: `language/services/audioService.ts`
- Adjust `sampleRate`, `channels`, `bitRate` in recording options

### Add Session Tracking
**File**: `server/src/index.ts`
- Currently saves with timestamp, could add database integration

## What's Next?

Your audio streaming foundation is ready! Consider adding:

1. **Speech-to-Text**: Use speech recognition APIs
2. **Real-time Streaming**: Instead of file uploads, stream chunks as recording
3. **Session Management**: Track and replay recordings
4. **Audio Processing**: Add effects, filtering, or analysis
5. **WebSocket Support**: For real-time bidirectional communication

## Need Help?

- Check `SETUP.md` for detailed architecture information
- Server logs show what's happening on the backend
- Check browser console (F12) for app errors
- Check your device logs in Expo Go or the simulator

Happy streaming! 🎙️
