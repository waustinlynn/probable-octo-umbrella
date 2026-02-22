# Testing Guide

Complete guide to testing the audio streaming application with generated test data and integration tests.

## Quick Start

Run all integration tests:

```bash
cd server
npm test
```

Expected output: **11 passed tests** ✅

Watch mode (re-run tests on file changes):

```bash
npm run test:watch
```

## Test Structure

### Test Audio Generator

**File**: `server/src/__tests__/testAudioGenerator.ts`

Generates synthetic WAV audio files for testing:

```typescript
import { audioGenerator } from './testAudioGenerator';

// Generate 2 seconds of silence
const silence = audioGenerator.generateSilence(2);

// Generate 3 seconds of 440Hz tone
const tone = audioGenerator.generateTone(3, 440);

// Generate 1 second of white noise
const noise = audioGenerator.generateWhiteNoise(1);

// Generate speech-like audio (mix of frequencies)
const speech = audioGenerator.generateSpeechLike(2);
```

### Audio Specifications

- **Sample Rate**: 16,000 Hz (standard for audio processing)
- **Bit Depth**: 16-bit linear PCM
- **Channels**: 1 (Mono)
- **Format**: WAV with proper headers

## Test Scenarios

### Integration Tests (11 Tests)

All tests use generated audio data and test the full upload flow.

#### Health Check
```
✓ GET /health endpoint returns ok status
```

#### Validation Tests
```
✓ Rejects uploads without sessionId
✓ Rejects uploads without audio file
```

#### Audio Upload Tests
```
✓ Successfully uploads silence audio
✓ Successfully uploads tone audio (440Hz)
✓ Successfully uploads white noise
✓ Successfully uploads speech-like audio
✓ Properly formats uploaded WAV files with correct headers
```

#### Session Handling
```
✓ Handles multiple uploads from the same session
✓ Tracks multiple sessions independently
✓ Handles rapid consecutive uploads (5 uploads simultaneously)
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Integration Tests Only
```bash
npm run test:integration
```

### Run in Watch Mode
```bash
npm run test:watch
```

Watches for file changes and automatically re-runs affected tests.

### Run with Coverage
```bash
npm test -- --coverage
```

Shows code coverage statistics for tested files.

## Understanding Test Output

Successful test run shows:
```
PASS src/__tests__/integration.test.ts
  Audio Streaming Integration Tests
    GET /health
      √ should return ok status (150 ms)
    POST /upload-audio
      √ should reject upload without sessionId (51 ms)
      [... more tests ...]

Test Suites: 1 passed, 1 total
Tests:       11 passed, 11 total
Time:        27.945 s
```

Each test shows:
- ✓ or ✗ (pass/fail)
- Test description
- Execution time in milliseconds

### Test Files Generated

Tests create temporary files during execution:
```
server/src/__tests__/test-uploads/
├── audio_test-session-123_1768269413418.wav
├── audio_tone-test-456_1768269413477.wav
└── ... (cleaned up after tests complete)
```

All test files are automatically deleted after each test suite runs.

## Writing New Tests

### Add a Test for Speech-Like Audio

```typescript
it('should upload longer speech-like audio', async () => {
  const sessionId = 'speech-test-long';
  const audioBuffer = audioGenerator.generateSpeechLike(5); // 5 seconds

  const response = await request(app.getExpressApp())
    .post('/upload-audio')
    .field('sessionId', sessionId)
    .attach('audioFile', audioBuffer, 'speech.wav');

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);

  const uploadedFiles = app.getUploadedFiles(sessionId);
  expect(uploadedFiles.length).toBe(1);
});
```

### Add a Test for Custom Frequency

```typescript
it('should upload various frequency tones', async () => {
  const frequencies = [220, 440, 880, 1760]; // Different musical notes

  for (const freq of frequencies) {
    const sessionId = `freq-test-${freq}`;
    const audioBuffer = audioGenerator.generateTone(1, freq);

    const response = await request(app.getExpressApp())
      .post('/upload-audio')
      .field('sessionId', sessionId)
      .attach('audioFile', audioBuffer, `tone-${freq}.wav');

    expect(response.status).toBe(200);
  }
});
```

## Manual Testing

### Test with curl

Upload test audio file:

```bash
# Generate a test file first (in Node.js):
# const { audioGenerator } = require('./dist/__tests__/testAudioGenerator');
# const buffer = audioGenerator.generateTone(1, 440);
# fs.writeFileSync('test.wav', buffer);

# Then upload it:
curl -X POST http://localhost:3000/upload-audio \
  -F "sessionId=manual-test-1" \
  -F "audioFile=@test.wav"
```

Expected response:
```json
{
  "success": true,
  "message": "Audio uploaded successfully",
  "filename": "audio_manual-test-1_1768269413418.wav",
  "sessionId": "manual-test-1"
}
```

### Test Health Endpoint

```bash
curl http://localhost:3000/health
```

Response:
```json
{"status":"ok"}
```

## Debugging Tests

### See Detailed Output

```bash
npm test -- --verbose
```

### Run Single Test File

```bash
npm test -- integration.test.ts
```

### Run Tests Matching Pattern

```bash
npm test -- --testNamePattern="upload"
```

Runs only tests with "upload" in the name.

## Test Utilities

### AudioStreamApp Methods (for testing)

```typescript
// Get uploaded files for a session
const files = app.getUploadedFiles('session-123');
// Returns: ['audio_session-123_1768269413418.wav']

// Get info about a specific file
const info = app.getFileInfo('audio_session-123_1768269413418.wav');
// Returns: { size: 256044, mtime: Date }

// Cleanup test files
app.cleanup();
```

## Performance Testing

The integration test suite includes a rapid upload test:
- Tests uploading 5 audio files simultaneously
- Verifies all files save correctly
- Ensures no race conditions

Current performance: **5 uploads in ~100ms**

## Continuous Integration

For CI/CD pipelines, add to your configuration:

```yaml
# .github/workflows/test.yml (GitHub Actions)
- name: Run tests
  run: |
    cd server
    npm install
    npm test -- --coverage
```

## Audio Generation Examples

### Create Different Test Scenarios

```typescript
// 1-second test suite
const testAudio = {
  silence: audioGenerator.generateSilence(1),
  tone440: audioGenerator.generateTone(1, 440),
  tone880: audioGenerator.generateTone(1, 880),
  noise: audioGenerator.generateWhiteNoise(1),
  speech: audioGenerator.generateSpeechLike(1),
};

// Each generates a valid WAV file ready for upload
Object.entries(testAudio).forEach(([name, buffer]) => {
  console.log(`${name}: ${buffer.length} bytes`);
});
```

Output:
```
silence: 32044 bytes
tone440: 32044 bytes
tone880: 32044 bytes
noise: 32044 bytes
speech: 32044 bytes
```

## Troubleshooting

### Tests fail with "Cannot find module"

```bash
rm -rf dist node_modules
npm install
npm test
```

### Tests timeout

Increase timeout in jest.config.js:
```javascript
testTimeout: 60000, // 60 seconds instead of 30
```

### Port already in use

Tests use random ports (not fixed 3000) so they shouldn't conflict. If you get port errors:

```bash
# Kill any running servers
lsof -ti:3000 | xargs kill -9  # macOS/Linux
```

## What's Tested

✅ Health check endpoint
✅ Audio file uploads with session tracking
✅ Error handling (missing fields)
✅ WAV file format integrity
✅ Multiple session isolation
✅ Rapid concurrent uploads
✅ File persistence

## What's Not Yet Tested

- gRPC bidirectional streaming (proto defined but not implemented in HTTP-based client yet)
- Real audio from expo-av (uses synthetic data)
- Production server load

## Next: Expand Testing

Add tests for:
```typescript
// Test with real audio from expo-av
// Test gRPC streaming endpoint
// Test concurrent multi-session scenarios
// Test file cleanup/retention policies
```

## Running Both App & Tests

```bash
# Terminal 1: Server with tests
cd server
npm run dev

# Terminal 2: Run tests
cd server
npm test:watch

# Terminal 3: React Native app
cd language
npm start
```

All three running simultaneously for full integration testing!
