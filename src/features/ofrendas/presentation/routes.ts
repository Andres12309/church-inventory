import type { Href } from 'expo-router';

export const OFRENDAS_ROUTES = {
  dashboard: (orgId?: string) =>
    (orgId ? `/(protected)/(tabs)/finanzas?orgId=${orgId}` : '/(protected)/(tabs)/finanzas') as Href,
  nuevo: (orgId: string) => `/(protected)/ofrendas/nuevo?orgId=${orgId}` as Href,
  editar: (id: string, orgId: string) =>
    `/(protected)/ofrendas/${id}?orgId=${orgId}` as Href,
} as const;
