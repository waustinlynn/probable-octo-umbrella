import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config/config';

export class OpenAIService {
  private client: OpenAI;

  constructor(apiKey: string = config.openai.apiKey) {
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Transcribe audio using Whisper API
   */
  async transcribe(audioBuffer: Buffer): Promise<string> {
    try {
      console.log('[OpenAIService] Transcribing audio...');

      // Create a temporary file to pass to the API
      const tempFile = path.join('/tmp', `audio_${Date.now()}.wav`);
      fs.writeFileSync(tempFile, audioBuffer);

      try {
        const response = await this.client.audio.transcriptions.create({
          file: fs.createReadStream(tempFile),
          model: config.openai.whisper.model,
          language: config.openai.whisper.language,
        } as any);

        console.log('[OpenAIService] Transcription complete:', response.text);
        return response.text;
      } finally {
        // Cleanup temp file
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }
    } catch (error) {
      console.error('[OpenAIService] Transcription failed:', error);
      throw new Error(`Failed to transcribe audio: ${error}`);
    }
  }

  /**
   * Stream GPT response for given transcript
   */
  async *streamCompletion(transcript: string): AsyncGenerator<string, void, unknown> {
    try {
      console.log('[OpenAIService] Starting GPT stream for transcript:', transcript);

      const stream = await this.client.chat.completions.create({
        model: config.openai.gpt.model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful, concise assistant. Keep responses brief (2-3 sentences max).',
          },
          {
            role: 'user',
            content: transcript,
          },
        ],
        stream: true,
        temperature: config.openai.gpt.temperature,
        max_tokens: config.openai.gpt.maxTokens,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          console.log('[OpenAIService] GPT chunk:', content);
          yield content;
        }
      }

      console.log('[OpenAIService] GPT stream complete');
    } catch (error) {
      console.error('[OpenAIService] GPT streaming failed:', error);
      throw new Error(`Failed to get GPT response: ${error}`);
    }
  }

  /**
   * Synthesize speech from text
   */
  async synthesizeSpeech(text: string): Promise<Buffer> {
    try {
      console.log('[OpenAIService] Generating speech for:', text);

      const response = await this.client.audio.speech.create({
        model: config.openai.tts.model,
        voice: config.openai.tts.voice,
        input: text,
        response_format: config.openai.tts.format as 'mp3' | 'opus' | 'aac' | 'flac',
        speed: config.openai.tts.speed,
      });

      // Convert response to buffer
      const chunks: Buffer[] = [];
      const reader = response.body?.getReader?.();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(Buffer.from(value));
        }
      } else {
        // Fallback if response.body doesn't have getReader
        const buffer = await response.arrayBuffer?.();
        if (buffer) chunks.push(Buffer.from(buffer));
      }

      const audioBuffer = Buffer.concat(chunks);
      console.log('[OpenAIService] Speech synthesis complete:', audioBuffer.length, 'bytes');
      return audioBuffer;
    } catch (error) {
      console.error('[OpenAIService] Speech synthesis failed:', error);
      throw new Error(`Failed to synthesize speech: ${error}`);
    }
  }

  /**
   * Stream speech synthesis (yields chunks as they're generated)
   */
  async *streamSynthesizeSpeech(text: string): AsyncGenerator<Buffer, void, unknown> {
    try {
      console.log('[OpenAIService] Starting speech stream for:', text);

      const response = await this.client.audio.speech.create({
        model: config.openai.tts.model,
        voice: config.openai.tts.voice,
        input: text,
        response_format: config.openai.tts.format as 'mp3' | 'opus' | 'aac' | 'flac',
        speed: config.openai.tts.speed,
      });

      const reader = response.body?.getReader?.();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            console.log('[OpenAIService] TTS chunk:', value.length, 'bytes');
            yield Buffer.from(value);
          }
        }
      }

      console.log('[OpenAIService] Speech stream complete');
    } catch (error) {
      console.error('[OpenAIService] Speech stream failed:', error);
      throw new Error(`Failed to stream speech: ${error}`);
    }
  }
}
