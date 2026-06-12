import type { Href } from 'expo-router';

export const OFRENDAS_ROUTES = {
  dashboard: (orgId?: string, opts?: { tipos?: boolean }) => {
    const query = new URLSearchParams();
    if (orgId) {
      query.set('orgId', orgId);
    }
    if (opts?.tipos) {
      query.set('tipos', '1');
    }
    const qs = query.toString();
    return (qs ? `/(protected)/(tabs)/finanzas?${qs}` : '/(protected)/(tabs)/finanzas') as Href;
  },
  nuevo: (orgId: string) => `/(protected)/ofrendas/nuevo?orgId=${orgId}` as Href,
  editar: (id: string, orgId: string) =>
    `/(protected)/ofrendas/${id}?orgId=${orgId}` as Href,
} as const;
