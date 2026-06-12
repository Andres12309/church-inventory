import { Stack } from 'expo-router';

export default function BienesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="nuevo" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
