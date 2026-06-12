import type { Modulo } from '../domain/entities/Modulo';
import type { Rol } from '../domain/entities/Rol';
import type { Usuario } from '../domain/entities/Usuario';
import type { ModuloCodigoValue, UserRoleCodigoValue } from '@/shared/infrastructure/database/schema';

type UsuarioRow = {
  id: string;
  organizacion_id: string;
  role_id: string;
  username: string | null;
  nombre: string;
  email: string | null;
  activo: number;
};

type RolRow = {
  id: string;
  codigo: string;
  nombre: string;
  nivel_minimo_orden: number | null;
  activo: number;
};

type ModuloRow = {
  id: string;
  codigo: string;
  nombre: string;
  ruta: string;
  orden: number;
  activo: number;
};

export function mapUsuarioRow(row: UsuarioRow): Usuario {
  return {
    id: row.id,
    organizacionId: row.organizacion_id,
    roleId: row.role_id,
    username: row.username,
    nombre: row.nombre,
    email: row.email,
    activo: row.activo === 1,
  };
}

export function mapRolRow(row: RolRow): Rol {
  return {
    id: row.id,
    codigo: row.codigo as UserRoleCodigoValue,
    nombre: row.nombre,
    nivelMinimoOrden: row.nivel_minimo_orden,
    activo: row.activo === 1,
  };
}

export function mapModuloRow(row: ModuloRow): Modulo {
  return {
    id: row.id,
    codigo: row.codigo as ModuloCodigoValue,
    nombre: row.nombre,
    ruta: row.ruta,
    orden: row.orden,
    activo: row.activo === 1,
  };
}
