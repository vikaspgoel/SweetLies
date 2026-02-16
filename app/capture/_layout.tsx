import { Stack } from 'expo-router';

export default function CaptureLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="claim" options={{ title: 'Bold claim' }} />
      <Stack.Screen name="upload" options={{ title: 'Upload labels' }} />
    </Stack>
  );
}
