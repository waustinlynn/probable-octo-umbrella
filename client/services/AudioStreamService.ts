import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { WebSocketManager } from './WebSocketManager';

interface AudioStreamConfig {
  wsManager: WebSocketManager;
  sessionId: string;
  sampleRate?: number;
  channels?: number;
}

export class AudioStreamService {
  private recording: Audio.Recording | null = null;
  private sound: Audio.Sound | null = null;
  private wsManager: WebSocketManager;
  private sessionId: string = '';
  private sampleRate: number = 16000;
  private channels: number = 1;
  private isInitialized = false;

  constructor() {
    // Initialize with dummy manager, will be set via initialize()
    this.wsManager = new WebSocketManager('');
  }

  async initialize(config: AudioStreamConfig): Promise<void> {
    try {
      this.wsManager = config.wsManager;
      this.sessionId = config.sessionId;
      this.sampleRate = config.sampleRate || 16000;
      this.channels = config.channels || 1;

      // Request audio permissions
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        throw new Error('Microphone permissions not granted');
      }

      // Set audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      this.isInitialized = true;
      console.log('[AudioStreamService] Initialized');
    } catch (error) {
      console.error('[AudioStreamService] Initialization failed:', error);
      throw error;
    }
  }

  async startRecording(): Promise<void> {
    try {
      if (!this.isInitialized) {
        throw new Error('AudioStreamService not initialized');
      }

      console.log('[AudioStreamService] Starting recording for session:', this.sessionId);

      // Stop any existing recording
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
      }

      this.recording = new Audio.Recording();

      const recordingOptions: Audio.RecordingOptions = {
        ios: {
          extension: '.wav',
          audioQuality: Audio.RecordingQuality.MAX,
          sampleRate: this.sampleRate,
          numberOfChannels: this.channels,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        android: {
          extension: '.wav',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: this.sampleRate,
          numberOfChannels: this.channels,
          bitRate: 128000,
        },
        web: {
          mediaSource: {
            audio: true,
          },
        },
      };

      await this.recording.prepareToRecordAsync(recordingOptions);
      await this.recording.startAsync();

      console.log('[AudioStreamService] Recording started');
    } catch (error) {
      console.error('[AudioStreamService] Failed to start recording:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<{ duration: number }> {
    try {
      if (!this.recording) {
        throw new Error('No recording in progress');
      }

      console.log('[AudioStreamService] Stopping recording');
      await this.recording.stopAndUnloadAsync();

      const uri = this.recording.getURI();
      if (!uri) {
        throw new Error('Failed to get recording URI');
      }

      // Get recording duration
      const status = await this.recording.getStatusAsync();
      const duration = status.durationMillis || 0;

      console.log('[AudioStreamService] Recording stopped, duration:', duration, 'ms');

      // Read audio file
      const base64Data = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Send audio to server
      await this.sendAudio(base64Data);

      this.recording = null;

      return { duration };
    } catch (error) {
      console.error('[AudioStreamService] Failed to stop recording:', error);
      throw error;
    }
  }

  private async sendAudio(base64Audio: string): Promise<void> {
    try {
      console.log('[AudioStreamService] Sending audio to server');

      // Send audio chunk message
      this.wsManager.send({
        type: 'audio.chunk',
        sessionId: this.sessionId,
        timestamp: Date.now(),
        data: {
          chunk: base64Audio,
          sequenceNumber: 1,
        },
      });

      // Send audio end message
      this.wsManager.send({
        type: 'audio.end',
        sessionId: this.sessionId,
        timestamp: Date.now(),
        data: {
          totalChunks: 1,
        },
      });

      console.log('[AudioStreamService] Audio sent to server');
    } catch (error) {
      console.error('[AudioStreamService] Failed to send audio:', error);
      throw error;
    }
  }

  async playAudio(base64Audio: string): Promise<void> {
    try {
      console.log('[AudioStreamService] Playing audio');

      // Stop any existing playback
      if (this.sound) {
        await this.sound.unloadAsync();
      }

      // Create data URI from base64
      const uri = `data:audio/mp3;base64,${base64Audio}`;

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );

      this.sound = sound;

      // Wait for playback to complete
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          console.log('[AudioStreamService] Playback finished');
        }
      });

      console.log('[AudioStreamService] Playback started');
    } catch (error) {
      console.error('[AudioStreamService] Failed to play audio:', error);
      throw error;
    }
  }

  async stopPlayback(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.stopAsync();
        console.log('[AudioStreamService] Playback stopped');
      }
    } catch (error) {
      console.error('[AudioStreamService] Failed to stop playback:', error);
    }
  }

  async cleanup(): Promise<void> {
    try {
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
      }

      if (this.sound) {
        await this.sound.unloadAsync();
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
      });

      console.log('[AudioStreamService] Cleaned up');
    } catch (error) {
      console.error('[AudioStreamService] Cleanup failed:', error);
    }
  }
}

// Export singleton instance
export const audioStreamService = new AudioStreamService();
