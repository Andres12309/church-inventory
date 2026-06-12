import { Redirect, Stack } from 'expo-router';

import { AUTH_ROUTES } from '@/features/auth/presentation/routes';
import { useAuthStore } from '@/features/auth/presentation/store/authStore';

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrating = useAuthStore((state) => state.isHydrating);

  if (!isHydrating && isAuthenticated) {
    return <Redirect href={AUTH_ROUTES.protectedHome} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
