import type { Organizacion } from '../domain/entities/Organizacion';
import type { OrganizacionNivel } from '../domain/entities/OrganizacionNivel';
import type { Ubicacion } from '../domain/entities/Ubicacion';

type OrganizacionRow = {
  id: string;
  nivel_id: string;
  parent_id: string | null;
  nombre: string;
  codigo_interno: string;
  descripcion: string | null;
  activo: number;
};

type OrganizacionNivelRow = {
  id: string;
  codigo: string;
  nombre: string;
  nivel_orden: number;
  es_hoja: number;
  activo: number;
};

type UbicacionRow = {
  id: string;
  organizacion_id: string;
  direccion: string;
  ciudad: string | null;
  provincia: string | null;
  pais: string;
  latitud: number | null;
  longitud: number | null;
};

export function mapOrganizacionRow(row: OrganizacionRow): Organizacion {
  return {
    id: row.id,
    nivelId: row.nivel_id,
    parentId: row.parent_id,
    nombre: row.nombre,
    codigoInterno: row.codigo_interno,
    descripcion: row.descripcion,
    activo: row.activo === 1,
  };
}

export function mapOrganizacionNivelRow(row: OrganizacionNivelRow): OrganizacionNivel {
  return {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    nivelOrden: row.nivel_orden,
    esHoja: row.es_hoja === 1,
    activo: row.activo === 1,
  };
}

export function mapUbicacionRow(row: UbicacionRow): Ubicacion {
  return {
    id: row.id,
    organizacionId: row.organizacion_id,
    direccion: row.direccion,
    ciudad: row.ciudad,
    provincia: row.provincia,
    pais: row.pais,
    latitud: row.latitud,
    longitud: row.longitud,
  };
}

export type { OrganizacionRow, OrganizacionNivelRow, UbicacionRow };
