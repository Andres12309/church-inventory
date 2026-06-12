import type { SQLiteDatabase } from 'expo-sqlite';
import { v4 as uuidv4 } from 'uuid';

import type { Rol } from '@/features/auth/domain/entities/Rol';
import type { Usuario } from '@/features/auth/domain/entities/Usuario';
import { hashPin } from '@/features/auth/infrastructure/PinHasher';
import { mapRolRow, mapUsuarioRow } from '@/features/auth/infrastructure/UsuarioMapper';
import {
  OrganizacionesColumns,
  RolesColumns,
  Tables,
  UsuariosColumns,
  type UserRoleCodigoValue,
} from '@/shared/infrastructure/database/schema';

import type {
  CrearUsuarioLocalPersistInput,
  IUsuarioLocalRepository,
} from '../../domain/repositories/IUsuarioLocalRepository';
import type { UsuarioListadoItem } from '../../domain/entities/UsuarioListadoItem';

export class SqliteUsuarioRepository implements IUsuarioLocalRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async crear(input: CrearUsuarioLocalPersistInput): Promise<Usuario> {
    const id = uuidv4();
    const pinHash = await hashPin(input.pin);
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO ${Tables.USUARIOS} (
        ${UsuariosColumns.ID},
        ${UsuariosColumns.ORGANIZACION_ID},
        ${UsuariosColumns.ROLE_ID},
        ${UsuariosColumns.USERNAME},
        ${UsuariosColumns.NOMBRE},
        ${UsuariosColumns.EMAIL},
        ${UsuariosColumns.PIN_HASH},
        ${UsuariosColumns.ACTIVO},
        ${UsuariosColumns.UPDATED_AT}
      ) VALUES (?, ?, ?, ?, ?, NULL, ?, 1, ?)`,
      [id, input.organizacionId, input.roleId, input.username.trim(), input.nombre.trim(), pinHash, now],
    );

    return {
      id,
      organizacionId: input.organizacionId,
      roleId: input.roleId,
      username: input.username.trim(),
      nombre: input.nombre.trim(),
      email: null,
      activo: true,
    };
  }

  async existeUsername(username: string): Promise<boolean> {
    const row = await this.db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) AS total
       FROM ${Tables.USUARIOS}
       WHERE LOWER(${UsuariosColumns.USERNAME}) = LOWER(?)
         AND ${UsuariosColumns.ACTIVO} = 1`,
      [username.trim()],
    );

    return (row?.total ?? 0) > 0;
  }

  async listarRolesPorCodigos(codigos: UserRoleCodigoValue[]): Promise<Rol[]> {
    if (codigos.length === 0) {
      return [];
    }

    const placeholders = codigos.map(() => '?').join(', ');
    const rows = await this.db.getAllAsync<{
      id: string;
      codigo: string;
      nombre: string;
      nivel_minimo_orden: number | null;
      activo: number;
    }>(
      `SELECT
        ${RolesColumns.ID} AS id,
        ${RolesColumns.CODIGO} AS codigo,
        ${RolesColumns.NOMBRE} AS nombre,
        ${RolesColumns.NIVEL_MINIMO_ORDEN} AS nivel_minimo_orden,
        ${RolesColumns.ACTIVO} AS activo
       FROM ${Tables.ROLES}
       WHERE ${RolesColumns.CODIGO} IN (${placeholders})
         AND ${RolesColumns.ACTIVO} = 1
       ORDER BY ${RolesColumns.NIVEL_MINIMO_ORDEN} DESC`,
      codigos,
    );

    return rows.map(mapRolRow);
  }

  async existeNombreEnOrganizacion(nombre: string, organizacionId: string): Promise<boolean> {
    const row = await this.db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) AS total
       FROM ${Tables.USUARIOS}
       WHERE ${UsuariosColumns.ORGANIZACION_ID} = ?
         AND LOWER(${UsuariosColumns.NOMBRE}) = LOWER(?)
         AND ${UsuariosColumns.ACTIVO} = 1`,
      [organizacionId, nombre.trim()],
    );

    return (row?.total ?? 0) > 0;
  }

  async listarEnOrganizaciones(organizacionIds: string[]): Promise<UsuarioListadoItem[]> {
    if (organizacionIds.length === 0) {
      return [];
    }

    const placeholders = organizacionIds.map(() => '?').join(', ');
    const rows = await this.db.getAllAsync<{
      id: string;
      nombre: string;
      rol_nombre: string;
      rol_codigo: string;
      org_nombre: string;
      org_codigo: string;
    }>(
      `SELECT
        u.${UsuariosColumns.ID} AS id,
        u.${UsuariosColumns.NOMBRE} AS nombre,
        r.${RolesColumns.NOMBRE} AS rol_nombre,
        r.${RolesColumns.CODIGO} AS rol_codigo,
        o.${OrganizacionesColumns.NOMBRE} AS org_nombre,
        o.${OrganizacionesColumns.CODIGO_INTERNO} AS org_codigo
       FROM ${Tables.USUARIOS} u
       INNER JOIN ${Tables.ROLES} r ON r.${RolesColumns.ID} = u.${UsuariosColumns.ROLE_ID}
       INNER JOIN ${Tables.ORGANIZACIONES} o ON o.${OrganizacionesColumns.ID} = u.${UsuariosColumns.ORGANIZACION_ID}
       WHERE u.${UsuariosColumns.ACTIVO} = 1
         AND u.${UsuariosColumns.ORGANIZACION_ID} IN (${placeholders})
       ORDER BY o.${OrganizacionesColumns.NOMBRE} ASC, u.${UsuariosColumns.NOMBRE} ASC`,
      organizacionIds,
    );

    return rows.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      rolNombre: row.rol_nombre,
      rolCodigo: row.rol_codigo,
      organizacionNombre: row.org_nombre,
      organizacionCodigo: row.org_codigo,
    }));
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    const row = await this.db.getFirstAsync<{
      id: string;
      organizacion_id: string;
      role_id: string;
      username: string | null;
      nombre: string;
      email: string | null;
      activo: number;
    }>(
      `SELECT
        ${UsuariosColumns.ID} AS id,
        ${UsuariosColumns.ORGANIZACION_ID} AS organizacion_id,
        ${UsuariosColumns.ROLE_ID} AS role_id,
        ${UsuariosColumns.USERNAME} AS username,
        ${UsuariosColumns.NOMBRE} AS nombre,
        ${UsuariosColumns.EMAIL} AS email,
        ${UsuariosColumns.ACTIVO} AS activo
       FROM ${Tables.USUARIOS}
       WHERE ${UsuariosColumns.ID} = ? AND ${UsuariosColumns.ACTIVO} = 1`,
      [id],
    );

    return row ? mapUsuarioRow(row) : null;
  }
}
