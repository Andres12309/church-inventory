import { Redirect, Stack } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { AppActivityIndicator } from '@/shared/presentation/ui/AppActivityIndicator';
import { WelcomeBackScreen } from '@/features/auth/presentation/screens/WelcomeBackScreen';
import { AUTH_ROUTES } from '@/features/auth/presentation/routes';
import { useAuthStore } from '@/features/auth/presentation/store/authStore';

export default function ProtectedLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const welcomePending = useAuthStore((state) => state.welcomePending);
  const usuarioActual = useAuthStore((state) => state.usuarioActual);
  const rolActual = useAuthStore((state) => state.rolActual);
  const completeWelcome = useAuthStore((state) => state.completeWelcome);

  const handleWelcomeComplete = useCallback(() => {
    completeWelcome();
  }, [completeWelcome]);

  if (isHydrating) {
    return (
      <ThemedView style={styles.loading}>
        <AppActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href={AUTH_ROUTES.login} />;
  }

  if (welcomePending && usuarioActual) {
    return (
      <WelcomeBackScreen
        userId={usuarioActual.id}
        displayName={usuarioActual.nombre}
        roleName={rolActual?.nombre ?? null}
        onComplete={handleWelcomeComplete}
      />
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="organizaciones" options={{ headerShown: false }} />
      <Stack.Screen name="bienes" options={{ headerShown: false }} />
      <Stack.Screen name="ofrendas" options={{ headerShown: false }} />
      <Stack.Screen name="sync" options={{ headerShown: false }} />
      <Stack.Screen name="usuarios" options={{ headerShown: false }} />
      <Stack.Screen name="reportes" options={{ headerShown: false }} />
      <Stack.Screen name="configuracion" options={{ headerShown: false }} />
      <Stack.Screen name="asistente" options={{ headerShown: false }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
