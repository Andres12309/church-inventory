import { Tables } from '@/shared/infrastructure/database/schema';

const TABLES_WITH_FOTO = new Set<string>([Tables.BIENES]);

export function sanitizePayloadForTransfer(
  tabla: string,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  if (!TABLES_WITH_FOTO.has(tabla)) {
    return payload;
  }

  const fotoUri = payload.foto_uri;
  const hasLocalPhoto = typeof fotoUri === 'string' && fotoUri.length > 0;

  return {
    ...payload,
    foto_uri: null,
    foto_disponible_local: hasLocalPhoto,
  };
}

export function deserializePayloadFromTransfer(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const { foto_disponible_local: _fotoFlag, ...rest } = payload;
  return rest;
}
