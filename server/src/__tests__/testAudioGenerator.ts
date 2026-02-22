import * as fs from "fs";
import * as path from "path";

/**
 * Generates synthetic audio test data
 * Creates WAV files with silence, tones, or white noise
 */
export class TestAudioGenerator {
  private sampleRate: number = 16000;
  private bitDepth: number = 16;
  private channels: number = 1;

  /**
   * Generate a WAV file with silence
   */
  generateSilence(duration: number): Buffer {
    return this.generateAudio(duration, (t) => 0);
  }

  /**
   * Generate a WAV file with a sine wave tone
   */
  generateTone(duration: number, frequency: number = 440): Buffer {
    return this.generateAudio(duration, (t) => {
      return Math.sin(2 * Math.PI * frequency * t);
    });
  }

  /**
   * Generate a WAV file with white noise
   */
  generateWhiteNoise(duration: number): Buffer {
    return this.generateAudio(duration, () => {
      return Math.random() * 2 - 1;
    });
  }

  /**
   * Generate a WAV file with a speech-like pattern (mix of frequencies)
   */
  generateSpeechLike(duration: number): Buffer {
    let time = 0;
    return this.generateAudio(duration, (t) => {
      // Mix of frequencies to simulate speech
      const f1 = 200 + Math.sin(t * 2) * 50;
      const f2 = 700 + Math.cos(t * 3) * 100;
      const f3 = 1200 + Math.sin(t * 1.5) * 150;

      const sample =
        Math.sin(2 * Math.PI * f1 * t) * 0.3 +
        Math.sin(2 * Math.PI * f2 * t) * 0.3 +
        Math.sin(2 * Math.PI * f3 * t) * 0.2;

      return Math.tanh(sample); // Add some distortion for realism
    });
  }

  /**
   * Core audio generation function
   */
  private generateAudio(
    duration: number,
    sampleGenerator: (t: number) => number
  ): Buffer {
    const numSamples = Math.floor(duration * this.sampleRate);
    const bytesPerSample = this.bitDepth / 8;
    const dataSize = numSamples * this.channels * bytesPerSample;

    // WAV header constants
    const headerSize = 44;
    const fileSize = headerSize + dataSize - 8;
    const byteRate =
      this.sampleRate * this.channels * bytesPerSample;
    const blockAlign = this.channels * bytesPerSample;

    // Create buffer for entire WAV file
    const buffer = Buffer.alloc(headerSize + dataSize);

    // WAV header
    buffer.write("RIFF", 0);
    buffer.writeUInt32LE(fileSize, 4);
    buffer.write("WAVE", 8);
    buffer.write("fmt ", 12);
    buffer.writeUInt32LE(16, 16); // fmt chunk size
    buffer.writeUInt16LE(1, 20); // audio format (PCM)
    buffer.writeUInt16LE(this.channels, 22);
    buffer.writeUInt32LE(this.sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(this.bitDepth, 34);
    buffer.write("data", 36);
    buffer.writeUInt32LE(dataSize, 40);

    // Generate PCM data
    let offset = headerSize;
    for (let i = 0; i < numSamples; i++) {
      const t = i / this.sampleRate;
      let sample = sampleGenerator(t);

      // Clamp to [-1, 1]
      sample = Math.max(-1, Math.min(1, sample));

      // Convert to 16-bit PCM
      const pcmValue = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      buffer.writeInt16LE(pcmValue, offset);
      offset += 2;
    }

    return buffer;
  }

  /**
   * Save generated audio to a file
   */
  saveToFile(buffer: Buffer, filepath: string): void {
    fs.writeFileSync(filepath, buffer);
  }

  /**
   * Get test audio file path
   */
  getTestFilePath(name: string): string {
    const testDir = path.join(__dirname, "test-audio");
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    return path.join(testDir, name);
  }

  /**
   * Cleanup test files
   */
  cleanupTestFiles(): void {
    const testDir = path.join(__dirname, "test-audio");
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  }
}

export const audioGenerator = new TestAudioGenerator();
