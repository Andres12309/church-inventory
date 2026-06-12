import type { Href } from 'expo-router';

export const REPORTES_ROUTES = {
  listado: '/(protected)/(tabs)/reportes' as Href,
} as const;

const TIPO_ETIQUETA: Record<string, string> = {
  bienes: 'Inventario',
  ofrendas: 'Finanzas',
  consolidado: 'Consolidado',
};

export function etiquetaTipoReporte(tipo: string): string {
  return TIPO_ETIQUETA[tipo] ?? tipo;
}
