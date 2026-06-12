import { useEffect, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { AppActivityIndicator } from '@/shared/presentation/ui/AppActivityIndicator';

import { useAuthStore } from '../store/authStore';
import { useAuthUseCases } from '../hooks/useAuthUseCases';

type AuthHydratorProps = {
  children: ReactNode;
};

export function AuthHydrator({ children }: AuthHydratorProps) {
  const { repository, restaurarSesion } = useAuthUseCases();
  const hydrateSession = useAuthStore((state) => state.hydrateSession);
  const isHydrating = useAuthStore((state) => state.isHydrating);

  useEffect(() => {
    void hydrateSession(repository, restaurarSesion);
  }, [hydrateSession, repository, restaurarSesion]);

  if (isHydrating) {
    return (
      <ThemedView style={styles.loading}>
        <AppActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
