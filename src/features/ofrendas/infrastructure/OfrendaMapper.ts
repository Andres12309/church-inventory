import type { Ofrenda } from '../domain/entities/Ofrenda';
import type { TipoActividad } from '../domain/entities/TipoActividad';

export function redondearMonto(monto: number): number {
  return Math.round(monto * 100) / 100;
}

type OfrendaRow = {
  id: string;
  organizacion_id: string;
  tipo_actividad_id: string;
  monto: number;
  fecha: string;
  descripcion: string | null;
  sync_vector: string;
  updated_at: string;
  updated_by_device: string;
  deleted_at: string | null;
};

type TipoActividadRow = {
  id: string;
  codigo: string;
  nombre: string;
  activo: number;
  sync_vector: string;
  updated_at: string;
  updated_by_device: string;
};

export function mapOfrendaRow(row: OfrendaRow): Ofrenda {
  return {
    id: row.id,
    organizacionId: row.organizacion_id,
    tipoActividadId: row.tipo_actividad_id,
    monto: redondearMonto(row.monto),
    fecha: row.fecha,
    descripcion: row.descripcion,
    activo: row.deleted_at == null,
    syncVector: row.sync_vector,
    updatedAt: row.updated_at,
    updatedByDevice: row.updated_by_device,
  };
}

export function mapTipoActividadRow(row: TipoActividadRow): TipoActividad {
  return {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    activo: row.activo === 1,
    syncVector: row.sync_vector ?? '{}',
    updatedAt: row.updated_at ?? new Date().toISOString(),
    updatedByDevice: row.updated_by_device ?? '',
  };
}

export type { OfrendaRow, TipoActividadRow };
