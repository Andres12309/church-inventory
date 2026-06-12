import type { SQLiteDatabase } from "expo-sqlite";
import { v4 as uuidv4 } from "uuid";

import {
  ModulosColumns,
  OrganizacionesColumns,
  RoleModulosColumns,
  RolesColumns,
  SeedIds,
  Tables,
  UsuariosColumns,
} from "@/shared/infrastructure/database/schema";

import type { Modulo } from "../domain/entities/Modulo";
import type { Rol } from "../domain/entities/Rol";
import type { Usuario } from "../domain/entities/Usuario";
import type { IUsuarioRepository } from "../domain/repositories/IUsuarioRepository";
import { ensureHierarchySeed } from "./ensureHierarchySeed";
import { hashPin, verifyPinHash } from "./PinHasher";
import { mapModuloRow, mapRolRow, mapUsuarioRow } from "./UsuarioMapper";

export class SqliteUsuarioRepository implements IUsuarioRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async ensureDefaultAdmin(): Promise<void> {
    await ensureHierarchySeed(this.db);
  }

  async ensurePerfilesDemostracion(): Promise<void> {
    await ensureHierarchySeed(this.db);
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

  async buscarPorUsername(username: string): Promise<Usuario | null> {
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
       WHERE LOWER(${UsuariosColumns.USERNAME}) = LOWER(?)
         AND ${UsuariosColumns.ACTIVO} = 1`,
      [username.trim()],
    );

    return row ? mapUsuarioRow(row) : null;
  }

  async buscarPorOrganizacion(orgId: string): Promise<Usuario[]> {
    const rows = await this.db.getAllAsync<{
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
       WHERE ${UsuariosColumns.ORGANIZACION_ID} = ? AND ${UsuariosColumns.ACTIVO} = 1
       ORDER BY ${UsuariosColumns.NOMBRE} ASC`,
      [orgId],
    );

    return rows.map(mapUsuarioRow);
  }

  async listarActivos(): Promise<Usuario[]> {
    const rows = await this.db.getAllAsync<{
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
       WHERE ${UsuariosColumns.ACTIVO} = 1
       ORDER BY ${UsuariosColumns.NOMBRE} ASC`,
    );

    return rows.map(mapUsuarioRow);
  }

  async verificarPin(usuarioId: string, pin: string): Promise<boolean> {
    const row = await this.db.getFirstAsync<{ pin_hash: string }>(
      `SELECT ${UsuariosColumns.PIN_HASH} AS pin_hash
       FROM ${Tables.USUARIOS}
       WHERE ${UsuariosColumns.ID} = ? AND ${UsuariosColumns.ACTIVO} = 1`,
      [usuarioId],
    );

    if (!row?.pin_hash) {
      return false;
    }

    return verifyPinHash(pin, row.pin_hash);
  }

  async crearUsuario(usuario: Usuario, pin: string): Promise<void> {
    const pinHash = await hashPin(pin);
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO ${Tables.USUARIOS} (
        ${UsuariosColumns.ID},
        ${UsuariosColumns.ORGANIZACION_ID},
        ${UsuariosColumns.ROLE_ID},
        ${UsuariosColumns.NOMBRE},
        ${UsuariosColumns.EMAIL},
        ${UsuariosColumns.PIN_HASH},
        ${UsuariosColumns.ACTIVO},
        ${UsuariosColumns.UPDATED_AT}
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        usuario.id || uuidv4(),
        usuario.organizacionId,
        usuario.roleId,
        usuario.nombre,
        usuario.email,
        pinHash,
        usuario.activo ? 1 : 0,
        now,
      ],
    );
  }

  async obtenerRolPorId(roleId: string): Promise<Rol | null> {
    const row = await this.db.getFirstAsync<{
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
       WHERE ${RolesColumns.ID} = ? AND ${RolesColumns.ACTIVO} = 1`,
      [roleId],
    );

    return row ? mapRolRow(row) : null;
  }

  async listarModulosPorRoleId(roleId: string): Promise<Modulo[]> {
    const rows = await this.db.getAllAsync<{
      id: string;
      codigo: string;
      nombre: string;
      ruta: string;
      orden: number;
      activo: number;
    }>(
      `SELECT
        m.${ModulosColumns.ID} AS id,
        m.${ModulosColumns.CODIGO} AS codigo,
        m.${ModulosColumns.NOMBRE} AS nombre,
        m.${ModulosColumns.RUTA} AS ruta,
        m.${ModulosColumns.ORDEN} AS orden,
        m.${ModulosColumns.ACTIVO} AS activo
       FROM ${Tables.MODULOS} m
       INNER JOIN ${Tables.ROLE_MODULOS} rm
         ON rm.${RoleModulosColumns.MODULO_ID} = m.${ModulosColumns.ID}
       WHERE rm.${RoleModulosColumns.ROLE_ID} = ?
         AND m.${ModulosColumns.ACTIVO} = 1
       ORDER BY m.${ModulosColumns.ORDEN} ASC`,
      [roleId],
    );

    return rows.map(mapModuloRow);
  }

  async actualizarUltimoAcceso(usuarioId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE ${Tables.USUARIOS}
       SET ${UsuariosColumns.ULTIMO_ACCESO} = ?, ${UsuariosColumns.UPDATED_AT} = ?
       WHERE ${UsuariosColumns.ID} = ?`,
      [now, now, usuarioId],
    );
  }
}
