import type { Href } from 'expo-router';

export const USUARIOS_ROUTES = {
  listado: '/(protected)/usuarios' as Href,
  nuevo: '/(protected)/usuarios/nuevo' as Href,
} as const;
