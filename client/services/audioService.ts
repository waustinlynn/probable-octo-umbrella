import { Audio } from "expo-av";
import { Platform } from "react-native";

interface AudioStreamConfig {
  serverUrl: string;
  sessionId: string;
  sampleRate?: number;
  channels?: number;
}

interface StreamStatus {
  isRecording: boolean;
  isStreaming: boolean;
  bytesRecorded: number;
  sessionId: string;
}

export class AudioService {
  private recording: Audio.Recording | null = null;
  private config: AudioStreamConfig | null = null;
  private status: StreamStatus = {
    isRecording: false,
    isStreaming: false,
    bytesRecorded: 0,
    sessionId: "",
  };

  async initialize(): Promise<void> {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        throw new Error("Audio permissions not granted");
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      console.log("Audio service initialized");
    } catch (error) {
      console.error("Failed to initialize audio service:", error);
      throw error;
    }
  }

  async startRecording(config: AudioStreamConfig): Promise<void> {
    try {
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
      }

      this.config = {
        ...config,
        sampleRate: config.sampleRate || 16000,
        channels: config.channels || 1,
      };

      this.status = {
        isRecording: true,
        isStreaming: true,
        bytesRecorded: 0,
        sessionId: config.sessionId,
      };

      const recordingOptions: Audio.RecordingOptions = {
        ios: {
          extension: ".wav",
          audioQuality: 'max' as any,
          sampleRate: this.config.sampleRate,
          numberOfChannels: this.config.channels,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        android: {
          extension: ".wav",
          outputFormat: "MPEG_4" as any,
          audioEncoder: "AAC",
          sampleRate: this.config.sampleRate,
          numberOfChannels: this.config.channels,
          bitRate: 128000,
        },
        web: {
          mediaSource: {
            audio: true,
          },
        },
      };

      this.recording = new Audio.Recording();

      if (Platform.OS === "web") {
        // Web implementation would go here
        throw new Error("Web audio streaming not yet implemented");
      }

      await this.recording.prepareToRecordAsync(recordingOptions);
      await this.recording.startAsync();

      console.log(`Recording started for session: ${config.sessionId}`);

      // Start streaming audio chunks
      this.streamAudioChunks();
    } catch (error) {
      this.status.isRecording = false;
      this.status.isStreaming = false;
      console.error("Failed to start recording:", error);
      throw error;
    }
  }

  private async streamAudioChunks(): Promise<void> {
    try {
      while (this.status.isRecording && this.recording && this.config) {
        // Record for 100ms chunks
        await new Promise((resolve) => setTimeout(resolve, 100));

        // In a real implementation, we would read the audio data from the recording
        // and send it to the server. For now, this is a placeholder that demonstrates
        // the streaming pattern.
      }
    } catch (error) {
      console.error("Error in audio streaming:", error);
      this.status.isStreaming = false;
    }
  }

  async stopRecording(): Promise<{ uri: string; duration: number }> {
    try {
      if (!this.recording) {
        throw new Error("No recording in progress");
      }

      this.status.isRecording = false;
      this.status.isStreaming = false;

      await this.recording.stopAndUnloadAsync();

      const uri = this.recording.getURI();

      if (!uri) {
        throw new Error("Failed to get recording URI");
      }

      console.log(`Recording saved to: ${uri}`);

      // Get duration from status
      const status = await this.recording.getStatusAsync();
      const duration = (status.durationMillis || 0) / 1000;

      // Upload to server
      await this.uploadAudioFile(uri);

      this.recording = null;
      this.config = null;

      return { uri, duration };
    } catch (error) {
      console.error("Failed to stop recording:", error);
      throw error;
    }
  }

  private async uploadAudioFile(uri: string): Promise<void> {
    try {
      if (!this.config) {
        throw new Error("No active session");
      }

      const formData = new FormData();
      formData.append("sessionId", this.config.sessionId);
      formData.append("audioFile", {
        uri,
        type: "audio/wav",
        name: `audio_${this.config.sessionId}.wav`,
      } as any);

      const response = await fetch(
        `${this.config.serverUrl}/upload-audio`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      console.log("Audio uploaded successfully");
    } catch (error) {
      console.error("Failed to upload audio:", error);
      throw error;
    }
  }

  getStatus(): StreamStatus {
    return { ...this.status };
  }

  async cleanup(): Promise<void> {
    try {
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        this.recording = null;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }
}

// Export singleton instance
export const audioService = new AudioService();
