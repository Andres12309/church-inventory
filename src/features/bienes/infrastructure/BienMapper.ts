import type { BienEstadoValue } from '@/shared/infrastructure/database/schema';

import type { Bien } from '../domain/entities/Bien';
import type { CategoriaBien } from '../domain/entities/CategoriaBien';

type BienRow = {
  id: string;
  organizacion_id: string;
  categoria_id: string;
  nombre: string;
  descripcion: string | null;
  estado: string;
  cantidad: number;
  valor_estimado: number | null;
  foto_uri: string | null;
  observaciones: string | null;
  sync_vector: string;
  updated_at: string;
  updated_by_device: string;
  deleted_at: string | null;
};

type CategoriaBienRow = {
  id: string;
  codigo: string;
  nombre: string;
  activo: number;
};

export function mapBienRow(row: BienRow): Bien {
  return {
    id: row.id,
    organizacionId: row.organizacion_id,
    categoriaId: row.categoria_id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    estado: row.estado as BienEstadoValue,
    cantidad: row.cantidad,
    valorEstimado: row.valor_estimado,
    fotoUri: row.foto_uri,
    observaciones: row.observaciones,
    activo: row.deleted_at == null,
    syncVector: row.sync_vector,
    updatedAt: row.updated_at,
    updatedByDevice: row.updated_by_device,
  };
}

export function mapCategoriaBienRow(row: CategoriaBienRow): CategoriaBien {
  return {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    activo: row.activo === 1,
  };
}

export type { BienRow, CategoriaBienRow };
