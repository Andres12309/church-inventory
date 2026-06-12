import type { Href } from 'expo-router';

export const AUTH_ROUTES = {
  login: '/(auth)/login' as Href,
  protectedHome: '/(protected)/(tabs)' as Href,
} as const;
