import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { audioService } from "@/services/audioService";
import { useThemeColor } from "@/hooks/use-theme-color";

interface AudioStreamButtonProps {
  serverUrl: string;
  onStatusChange?: (status: {
    isRecording: boolean;
    isStreaming: boolean;
  }) => void;
}

export function AudioStreamButton({
  serverUrl,
  onStatusChange,
}: AudioStreamButtonProps): React.ReactElement {
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(
    `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );

  const textColor = useThemeColor(
    { light: "#000", dark: "#fff" },
    "text"
  );
  const buttonColor = useThemeColor(
    { light: "#007AFF", dark: "#0A84FF" },
    "primary"
  );
  const backgroundColor = useThemeColor(
    { light: "#f5f5f5", dark: "#1c1c1c" },
    "background"
  );

  const handleStartRecording = async (): Promise<void> => {
    try {
      setIsLoading(true);

      // Initialize audio service if needed
      await audioService.initialize();

      // Start recording and streaming
      await audioService.startRecording({
        serverUrl,
        sessionId,
        sampleRate: 16000,
        channels: 1,
      });

      setIsRecording(true);
      onStatusChange?.({ isRecording: true, isStreaming: true });
    } catch (error) {
      Alert.alert("Error", `Failed to start recording: ${error}`);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopRecording = async (): Promise<void> => {
    try {
      setIsLoading(true);

      const result = await audioService.stopRecording();

      setIsRecording(false);
      onStatusChange?.({ isRecording: false, isStreaming: false });

      Alert.alert("Success", `Recording saved: ${result.duration.toFixed(2)}s`);
    } catch (error) {
      Alert.alert("Error", `Failed to stop recording: ${error}`);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const buttonText = isRecording ? "Stop Recording" : "Start Recording";
  const buttonBgColor = isRecording ? "#FF3B30" : buttonColor;

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: buttonBgColor }]}
        onPress={isRecording ? handleStopRecording : handleStartRecording}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={[styles.buttonText, { color: "#fff" }]}>
            {buttonText}
          </Text>
        )}
      </TouchableOpacity>

      {isRecording && (
        <Text style={[styles.statusText, { color: textColor }]}>
          Recording... (Session: {sessionId.substr(0, 12)}...)
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    gap: 12,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 200,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  statusText: {
    fontSize: 12,
    marginTop: 8,
  },
});
