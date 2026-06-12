import type { Href } from 'expo-router';

export const BIENES_ROUTES = {
  listado: (orgId?: string) =>
    (orgId
      ? `/(protected)/(tabs)/inventario?orgId=${orgId}`
      : '/(protected)/(tabs)/inventario') as Href,
  nuevo: (orgId: string) => `/(protected)/bienes/nuevo?orgId=${orgId}` as Href,
  editar: (id: string, orgId: string) =>
    `/(protected)/bienes/${id}?orgId=${orgId}` as Href,
} as const;
