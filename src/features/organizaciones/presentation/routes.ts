import type { Href } from 'expo-router';

export const ORGANIZACIONES_ROUTES = {
  dashboard: '/(protected)/organizaciones' as Href,
  nuevaCatedral: '/(protected)/organizaciones/catedral/nuevo' as Href,
  editarCatedral: (id: string) => `/(protected)/organizaciones/catedral/${id}` as Href,
  nuevaParroquia: (parentId: string) =>
    `/(protected)/organizaciones/parroquia/nuevo?parentId=${parentId}` as Href,
  editarParroquia: (id: string) => `/(protected)/organizaciones/parroquia/${id}` as Href,
  nuevaCapilla: (parentId: string) =>
    `/(protected)/organizaciones/capilla/nuevo?parentId=${parentId}` as Href,
  editarCapilla: (id: string) => `/(protected)/organizaciones/capilla/${id}` as Href,
} as const;
