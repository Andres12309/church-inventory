import { Redirect } from 'expo-router';

import { AUTH_ROUTES } from '@/features/auth/presentation/routes';
import { useAuthStore } from '@/features/auth/presentation/store/authStore';

export default function RootIndex() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return <Redirect href={AUTH_ROUTES.protectedHome} />;
  }

  return <Redirect href={AUTH_ROUTES.login} />;
}
