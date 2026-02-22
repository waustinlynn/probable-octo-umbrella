import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AudioStreamProvider } from '@/context/AudioStreamContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8080';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AudioStreamProvider wsUrl={WS_URL}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AudioStreamProvider>
  );
}
