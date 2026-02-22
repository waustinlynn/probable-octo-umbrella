import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useAudioStream } from '@/hooks/useAudioStream';
import { useThemeColor } from '@/hooks/use-theme-color';

export function StreamingButton(): React.ReactElement {
  const { state, startRecording, stopRecording } = useAudioStream();

  const backgroundColor = useThemeColor(
    { light: '#f5f5f5', dark: '#1c1c1c' },
    'background'
  );
  const textColor = useThemeColor(
    { light: '#000', dark: '#fff' },
    'text'
  );
  const accentColor = useThemeColor(
    { light: '#007AFF', dark: '#0A84FF' },
    'primary'
  );

  const handleStartRecording = async (): Promise<void> => {
    try {
      await startRecording();
    } catch (error) {
      Alert.alert('Error', `Failed to start recording: ${error}`);
    }
  };

  const handleStopRecording = async (): Promise<void> => {
    try {
      await stopRecording();
    } catch (error) {
      Alert.alert('Error', `Failed to stop recording: ${error}`);
    }
  };

  const buttonText = state.isRecording ? 'Stop Recording' : 'Start Recording';
  const buttonColor = state.isRecording ? '#FF3B30' : accentColor;
  const isDisabled = state.isProcessing || !state.isConnected;

  return (
    <ScrollView style={[styles.container, { backgroundColor }]}>
      {/* Connection Status */}
      {!state.isConnected && (
        <View style={[styles.card, { backgroundColor: '#fee5e5' }]}>
          <Text style={[styles.statusText, { color: '#d32f2f' }]}>
            ⚠ Not connected to server
          </Text>
          {state.connectionError && (
            <Text style={[styles.errorDetails, { color: '#d32f2f' }]}>
              {state.connectionError}
            </Text>
          )}
        </View>
      )}

      {/* Error Display */}
      {state.error && (
        <View style={[styles.card, { backgroundColor: '#fee5e5' }]}>
          <Text style={[styles.statusText, { color: '#d32f2f' }]}>
            ❌ {state.error}
          </Text>
        </View>
      )}

      {/* Recording Button */}
      <View style={[styles.card, { backgroundColor }]}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: buttonColor }]}
          onPress={state.isRecording ? handleStopRecording : handleStartRecording}
          disabled={isDisabled}
          activeOpacity={0.8}
        >
          {state.isProcessing ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <>
              <Text style={styles.buttonEmoji}>
                {state.isRecording ? '⏹' : '🎙'}
              </Text>
              <Text style={styles.buttonText}>{buttonText}</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Recording Status */}
        {state.isRecording && (
          <View style={styles.recordingStatus}>
            <View style={styles.recordingDot} />
            <Text style={[styles.recordingText, { color: textColor }]}>
              Recording...
            </Text>
          </View>
        )}

        {/* Stage Indicator */}
        {state.stage !== 'idle' && state.stage !== 'recording' && (
          <Text style={[styles.stageText, { color: accentColor }]}>
            {state.stage === 'transcribing' && '📝 Transcribing audio...'}
            {state.stage === 'generating' && '✨ Generating response...'}
            {state.stage === 'playing' && '🔊 Playing response...'}
            {state.stage === 'error' && '❌ Error occurred'}
          </Text>
        )}
      </View>

      {/* Transcript Display */}
      {state.transcript && (
        <View style={[styles.card, styles.contentCard]}>
          <Text style={[styles.label, { color: textColor }]}>You said:</Text>
          <Text style={[styles.content, { color: textColor }]}>
            {state.transcript}
          </Text>
        </View>
      )}

      {/* LLM Response Display */}
      {state.llmResponse && (
        <View style={[styles.card, styles.responseCard]}>
          <Text style={[styles.label, { color: textColor }]}>Response:</Text>
          <Text style={[styles.content, { color: textColor }]}>
            {state.llmResponse}
          </Text>
        </View>
      )}

      {/* Debug Info */}
      {__DEV__ && (
        <View style={[styles.card, styles.debugCard]}>
          <Text style={[styles.debugText, { color: textColor }]}>
            Debug Info:
          </Text>
          <Text style={[styles.debugText, { color: textColor, fontSize: 12 }]}>
            Connected: {state.isConnected ? '✓' : '✗'}
          </Text>
          <Text style={[styles.debugText, { color: textColor, fontSize: 12 }]}>
            Stage: {state.stage}
          </Text>
          <Text style={[styles.debugText, { color: textColor, fontSize: 12 }]}>
            Session: {state.currentSessionId?.substring(0, 20)}...
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  contentCard: {
    backgroundColor: '#f0f0f0',
  },
  responseCard: {
    backgroundColor: '#e3f2fd',
  },
  debugCard: {
    backgroundColor: '#f5f5f5',
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 64,
  },
  buttonEmoji: {
    fontSize: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  recordingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    justifyContent: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  recordingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  stageText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
    textAlign: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  errorDetails: {
    fontSize: 12,
    marginTop: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    opacity: 0.7,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
  },
  debugText: {
    fontSize: 11,
    fontFamily: 'Courier New',
    marginVertical: 2,
  },
});
