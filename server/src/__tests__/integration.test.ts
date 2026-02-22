import request, { SuperTest, Test } from "supertest";
import * as fs from "fs";
import * as path from "path";
import { AudioStreamApp } from "../app";
import { audioGenerator } from "./testAudioGenerator";

describe("Audio Streaming Integration Tests", () => {
  let app: AudioStreamApp;
  let uploadDir: string;

  beforeEach(() => {
    // Create temporary upload directory for each test
    uploadDir = path.join(__dirname, "test-uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    app = new AudioStreamApp({ uploadDir });
  });

  afterEach(() => {
    // Cleanup
    app.cleanup();
    if (fs.existsSync(uploadDir)) {
      fs.rmSync(uploadDir, { recursive: true });
    }
  });

  describe("GET /health", () => {
    it("should return ok status", async () => {
      const response = await request(app.getExpressApp()).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: "ok" });
    });
  });

  describe("POST /upload-audio", () => {
    it("should reject upload without sessionId", async () => {
      const audioBuffer = audioGenerator.generateSilence(1);

      const response = await request(app.getExpressApp())
        .post("/upload-audio")
        .attach("audioFile", audioBuffer, "test.wav");

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Missing sessionId");
    });

    it("should reject upload without audio file", async () => {
      const response = await request(app.getExpressApp())
        .post("/upload-audio")
        .field("sessionId", "test-session-123");

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("No audio file provided");
    });

    it("should successfully upload silence audio", async () => {
      const sessionId = "test-session-123";
      const audioBuffer = audioGenerator.generateSilence(1);

      const response = await request(app.getExpressApp())
        .post("/upload-audio")
        .field("sessionId", sessionId)
        .attach("audioFile", audioBuffer, "test.wav");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.sessionId).toBe(sessionId);
      expect(response.body.filename).toContain(`audio_${sessionId}`);
    });

    it("should successfully upload tone audio", async () => {
      const sessionId = "tone-test-456";
      const audioBuffer = audioGenerator.generateTone(2, 440); // 2s, 440Hz

      const response = await request(app.getExpressApp())
        .post("/upload-audio")
        .field("sessionId", sessionId)
        .attach("audioFile", audioBuffer, "tone.wav");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify file was actually saved
      const uploadedFiles = app.getUploadedFiles(sessionId);
      expect(uploadedFiles.length).toBe(1);
    });

    it("should successfully upload white noise", async () => {
      const sessionId = "noise-test-789";
      const audioBuffer = audioGenerator.generateWhiteNoise(1);

      const response = await request(app.getExpressApp())
        .post("/upload-audio")
        .field("sessionId", sessionId)
        .attach("audioFile", audioBuffer, "noise.wav");

      expect(response.status).toBe(200);

      const uploadedFiles = app.getUploadedFiles(sessionId);
      expect(uploadedFiles.length).toBe(1);

      // Check file size
      const fileInfo = app.getFileInfo(uploadedFiles[0]);
      expect(fileInfo).not.toBeNull();
      expect(fileInfo!.size).toBeGreaterThan(0);
    });

    it("should successfully upload speech-like audio", async () => {
      const sessionId = "speech-test-1011";
      const audioBuffer = audioGenerator.generateSpeechLike(3);

      const response = await request(app.getExpressApp())
        .post("/upload-audio")
        .field("sessionId", sessionId)
        .attach("audioFile", audioBuffer, "speech.wav");

      expect(response.status).toBe(200);

      const uploadedFiles = app.getUploadedFiles(sessionId);
      expect(uploadedFiles.length).toBe(1);
    });

    it("should handle multiple uploads from same session", async () => {
      const sessionId = "multi-test-1213";

      // Upload first audio
      const audio1 = audioGenerator.generateSilence(1);
      const response1 = await request(app.getExpressApp())
        .post("/upload-audio")
        .field("sessionId", sessionId)
        .attach("audioFile", audio1, "part1.wav");

      expect(response1.status).toBe(200);

      // Upload second audio
      const audio2 = audioGenerator.generateTone(1, 880);
      const response2 = await request(app.getExpressApp())
        .post("/upload-audio")
        .field("sessionId", sessionId)
        .attach("audioFile", audio2, "part2.wav");

      expect(response2.status).toBe(200);

      // Verify both files exist
      const uploadedFiles = app.getUploadedFiles(sessionId);
      expect(uploadedFiles.length).toBe(2);
      expect(uploadedFiles[0]).toContain(sessionId);
      expect(uploadedFiles[1]).toContain(sessionId);
    });

    it("should create properly formatted WAV files", async () => {
      const sessionId = "wav-format-test";
      const duration = 0.5;
      const audioBuffer = audioGenerator.generateTone(duration, 440);

      const response = await request(app.getExpressApp())
        .post("/upload-audio")
        .field("sessionId", sessionId)
        .attach("audioFile", audioBuffer, "test.wav");

      expect(response.status).toBe(200);

      const uploadedFiles = app.getUploadedFiles(sessionId);
      const filepath = path.join(uploadDir, uploadedFiles[0]);
      const savedBuffer = fs.readFileSync(filepath);

      // Verify WAV header
      expect(savedBuffer.toString("ascii", 0, 4)).toBe("RIFF");
      expect(savedBuffer.toString("ascii", 8, 12)).toBe("WAVE");
      expect(savedBuffer.toString("ascii", 12, 16)).toBe("fmt ");
      expect(savedBuffer.toString("ascii", 36, 40)).toBe("data");

      // Verify minimal size (WAV header is 44 bytes + audio data)
      expect(savedBuffer.length).toBeGreaterThan(44);
    });
  });

  describe("Server Functionality", () => {
    it("should track multiple sessions independently", async () => {
      const sessions = ["session-1", "session-2", "session-3"];

      for (const sessionId of sessions) {
        const audioBuffer = audioGenerator.generateWhiteNoise(0.5);
        const response = await request(app.getExpressApp())
          .post("/upload-audio")
          .field("sessionId", sessionId)
          .attach("audioFile", audioBuffer, "audio.wav");

        expect(response.status).toBe(200);
      }

      // Verify all sessions have their files
      for (const sessionId of sessions) {
        const files = app.getUploadedFiles(sessionId);
        expect(files.length).toBe(1);
      }
    });

    it("should handle rapid consecutive uploads", async () => {
      const sessionId = "rapid-upload-test";
      const uploadCount = 5;

      const uploadPromises = [];
      for (let i = 0; i < uploadCount; i++) {
        const audioBuffer = audioGenerator.generateTone(0.2, 440 + i * 100);
        uploadPromises.push(
          request(app.getExpressApp())
            .post("/upload-audio")
            .field("sessionId", sessionId)
            .attach("audioFile", audioBuffer, `audio-${i}.wav`)
        );
      }

      const responses = await Promise.all(uploadPromises);

      // All should succeed
      responses.forEach((response: any) => {
        expect(response.status).toBe(200);
      });

      // Verify all files were saved
      const uploadedFiles = app.getUploadedFiles(sessionId);
      expect(uploadedFiles.length).toBe(uploadCount);
    });
  });
});
