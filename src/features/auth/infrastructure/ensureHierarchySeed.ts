import type { SQLiteDatabase } from 'expo-sqlite';

import { HIERARCHY_SEED_PREFIX, HIERARCHY_V1 } from '@/shared/config/hierarchy';
import {
  OrganizacionesColumns,
  RoleModulosColumns,
  RolesColumns,
  SeedIds,
  Tables,
  UsuariosColumns,
} from '@/shared/infrastructure/database/schema';

import { hashPin } from './PinHasher';

const NIVEL_ID_BY_CODIGO: Record<string, string> = {
  capilla: SeedIds.NIVELES.CAPILLA,
  parroquia: SeedIds.NIVELES.PARROQUIA,
  diocesis: SeedIds.NIVELES.DIOCESIS,
};

const ROLE_ID_BY_CODIGO: Record<string, string> = {
  super_admin: SeedIds.ROLES.SUPER_ADMIN,
  obispo: SeedIds.ROLES.OBISPO,
  parroco: SeedIds.ROLES.PARROCO,
  encargado_capilla: SeedIds.ROLES.ENCARGADO,
};

const MODULO_ID_BY_CODIGO: Record<string, string> = {
  configuracion: 'seed-mod-configuracion',
  usuarios: 'seed-mod-usuarios',
  organizaciones: 'seed-mod-organizaciones',
  inventario_bienes: 'seed-mod-inventario',
  ofrendas: 'seed-mod-ofrendas',
  sync: 'seed-mod-sync',
  reportes: 'seed-mod-reportes',
};

const MANAGED_ROLE_IDS = Object.values(SeedIds.ROLES);

/** Serializa llamadas concurrentes (login + hydrate + dashboard). */
let seedQueue: Promise<void> = Promise.resolve();

function buildNotInClause(ids: string[]): { sql: string; params: string[] } {
  if (ids.length === 0) {
    return { sql: '1 = 1', params: [] };
  }
  const placeholders = ids.map(() => '?').join(', ');
  return { sql: `id NOT IN (${placeholders})`, params: ids };
}

async function syncHierarchySeed(db: SQLiteDatabase): Promise<void> {
  const now = new Date().toISOString();
  const configOrgIds = HIERARCHY_V1.organizaciones.map((o) => o.id);
  const configUserIds = HIERARCHY_V1.usuarios.map((u) => u.id);

  const usersWithPinHash = await Promise.all(
    HIERARCHY_V1.usuarios.map(async (user) => ({
      user,
      pinHash: await hashPin(user.pin),
      activo: user.activo !== false ? 1 : 0,
    })),
  );

  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      `INSERT OR IGNORE INTO ${Tables.ROLES} (
        ${RolesColumns.ID}, ${RolesColumns.CODIGO}, ${RolesColumns.NOMBRE},
        ${RolesColumns.NIVEL_MINIMO_ORDEN}, ${RolesColumns.ACTIVO}
      ) VALUES (?, ?, ?, ?, 1)`,
      [SeedIds.ROLES.OBISPO, 'obispo', 'Obispo', 3],
    );

    for (const org of HIERARCHY_V1.organizaciones) {
      const activo = org.activo !== false ? 1 : 0;
      await txn.runAsync(
        `INSERT INTO ${Tables.ORGANIZACIONES} (
          ${OrganizacionesColumns.ID}, ${OrganizacionesColumns.NIVEL_ID}, ${OrganizacionesColumns.PARENT_ID},
          ${OrganizacionesColumns.NOMBRE}, ${OrganizacionesColumns.CODIGO_INTERNO}, ${OrganizacionesColumns.ACTIVO},
          ${OrganizacionesColumns.SYNC_VECTOR}, ${OrganizacionesColumns.UPDATED_AT}, ${OrganizacionesColumns.UPDATED_BY_DEVICE},
          ${OrganizacionesColumns.DELETED_AT}
        ) VALUES (?, ?, ?, ?, ?, ?, '{}', ?, '', NULL)
        ON CONFLICT(${OrganizacionesColumns.ID}) DO UPDATE SET
          ${OrganizacionesColumns.NIVEL_ID} = excluded.${OrganizacionesColumns.NIVEL_ID},
          ${OrganizacionesColumns.PARENT_ID} = excluded.${OrganizacionesColumns.PARENT_ID},
          ${OrganizacionesColumns.NOMBRE} = excluded.${OrganizacionesColumns.NOMBRE},
          ${OrganizacionesColumns.CODIGO_INTERNO} = excluded.${OrganizacionesColumns.CODIGO_INTERNO},
          ${OrganizacionesColumns.ACTIVO} = excluded.${OrganizacionesColumns.ACTIVO},
          ${OrganizacionesColumns.DELETED_AT} = NULL,
          ${OrganizacionesColumns.UPDATED_AT} = excluded.${OrganizacionesColumns.UPDATED_AT}`,
        [
          org.id,
          NIVEL_ID_BY_CODIGO[org.nivelCodigo],
          org.parentId,
          org.nombre,
          org.codigoInterno,
          activo,
          now,
        ],
      );
    }

    const orgNotIn = buildNotInClause(configOrgIds);
    await txn.runAsync(
      `UPDATE ${Tables.ORGANIZACIONES}
       SET ${OrganizacionesColumns.ACTIVO} = 0,
           ${OrganizacionesColumns.DELETED_AT} = ?,
           ${OrganizacionesColumns.UPDATED_AT} = ?
       WHERE id LIKE ? || '%' AND ${orgNotIn.sql}`,
      [now, now, HIERARCHY_SEED_PREFIX.org, ...orgNotIn.params],
    );

    for (const { user, pinHash, activo } of usersWithPinHash) {
      await txn.runAsync(
        `INSERT INTO ${Tables.USUARIOS} (
          ${UsuariosColumns.ID}, ${UsuariosColumns.ORGANIZACION_ID}, ${UsuariosColumns.ROLE_ID},
          ${UsuariosColumns.USERNAME}, ${UsuariosColumns.NOMBRE}, ${UsuariosColumns.EMAIL}, ${UsuariosColumns.PIN_HASH},
          ${UsuariosColumns.ACTIVO}, ${UsuariosColumns.UPDATED_AT}
        ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)
        ON CONFLICT(${UsuariosColumns.ID}) DO UPDATE SET
          ${UsuariosColumns.ORGANIZACION_ID} = excluded.${UsuariosColumns.ORGANIZACION_ID},
          ${UsuariosColumns.ROLE_ID} = excluded.${UsuariosColumns.ROLE_ID},
          ${UsuariosColumns.USERNAME} = excluded.${UsuariosColumns.USERNAME},
          ${UsuariosColumns.NOMBRE} = excluded.${UsuariosColumns.NOMBRE},
          ${UsuariosColumns.PIN_HASH} = excluded.${UsuariosColumns.PIN_HASH},
          ${UsuariosColumns.ACTIVO} = excluded.${UsuariosColumns.ACTIVO},
          ${UsuariosColumns.UPDATED_AT} = excluded.${UsuariosColumns.UPDATED_AT}`,
        [
          user.id,
          user.organizacionId,
          ROLE_ID_BY_CODIGO[user.roleCodigo],
          user.username,
          user.nombre,
          pinHash,
          activo,
          now,
        ],
      );
    }

    const userNotIn = buildNotInClause(configUserIds);
    await txn.runAsync(
      `UPDATE ${Tables.USUARIOS}
       SET ${UsuariosColumns.ACTIVO} = 0,
           ${UsuariosColumns.UPDATED_AT} = ?
       WHERE id LIKE ? || '%' AND ${userNotIn.sql}`,
      [now, HIERARCHY_SEED_PREFIX.user, ...userNotIn.params],
    );

    for (const roleId of MANAGED_ROLE_IDS) {
      await txn.runAsync(
        `DELETE FROM ${Tables.ROLE_MODULOS} WHERE ${RoleModulosColumns.ROLE_ID} = ?`,
        [roleId],
      );
    }

    for (const permiso of HIERARCHY_V1.permisos) {
      const roleId = ROLE_ID_BY_CODIGO[permiso.role];
      for (const modulo of permiso.modulos) {
        const moduloId = MODULO_ID_BY_CODIGO[modulo];
        await txn.runAsync(
          `INSERT OR IGNORE INTO ${Tables.ROLE_MODULOS} (${RoleModulosColumns.ROLE_ID}, ${RoleModulosColumns.MODULO_ID})
           VALUES (?, ?)`,
          [roleId, moduloId],
        );
      }
    }
  });
}

/**
 * Sincroniza `hierarchy.ts` → SQLite (idempotente + UPSERT).
 * Solo gestiona IDs con prefijo seed-org- / seed-user-.
 * Usuarios creados en la app (UUID) no se tocan.
 */
export async function ensureHierarchySeed(db: SQLiteDatabase): Promise<void> {
  const run = seedQueue.then(() => syncHierarchySeed(db));
  seedQueue = run.catch(() => undefined);
  await run;
}
