import type { SQLiteDatabase } from 'expo-sqlite';

import {
  OrganizacionNivelesColumns,
  OrganizacionesColumns,
  Tables,
  UbicacionesColumns,
} from '@/shared/infrastructure/database/schema';

import type { Organizacion } from '../domain/entities/Organizacion';
import type { OrganizacionNivel } from '../domain/entities/OrganizacionNivel';
import type { Ubicacion } from '../domain/entities/Ubicacion';
import type { IOrganizacionRepository } from '../domain/repositories/IOrganizacionRepository';
import {
  mapOrganizacionNivelRow,
  mapOrganizacionRow,
  mapUbicacionRow,
} from './OrganizacionMapper';

const orgSelect = (alias: string) => `
  ${alias}.${OrganizacionesColumns.ID} AS id,
  ${alias}.${OrganizacionesColumns.NIVEL_ID} AS nivel_id,
  ${alias}.${OrganizacionesColumns.PARENT_ID} AS parent_id,
  ${alias}.${OrganizacionesColumns.NOMBRE} AS nombre,
  ${alias}.${OrganizacionesColumns.CODIGO_INTERNO} AS codigo_interno,
  ${alias}.${OrganizacionesColumns.DESCRIPCION} AS descripcion,
  ${alias}.${OrganizacionesColumns.ACTIVO} AS activo
`;

export class SqliteOrganizacionRepository implements IOrganizacionRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async obtenerPorId(id: string): Promise<Organizacion | null> {
    const row = await this.db.getFirstAsync<Parameters<typeof mapOrganizacionRow>[0]>(
      `SELECT ${orgSelect('o')}
       FROM ${Tables.ORGANIZACIONES} o
       WHERE o.${OrganizacionesColumns.ID} = ?
         AND o.${OrganizacionesColumns.DELETED_AT} IS NULL`,
      [id],
    );

    return row ? mapOrganizacionRow(row) : null;
  }

  async obtenerUbicacion(orgId: string): Promise<Ubicacion | null> {
    const row = await this.db.getFirstAsync<Parameters<typeof mapUbicacionRow>[0]>(
      `SELECT
        ${UbicacionesColumns.ID} AS id,
        ${UbicacionesColumns.ORGANIZACION_ID} AS organizacion_id,
        ${UbicacionesColumns.DIRECCION} AS direccion,
        ${UbicacionesColumns.CIUDAD} AS ciudad,
        ${UbicacionesColumns.PROVINCIA} AS provincia,
        ${UbicacionesColumns.PAIS} AS pais,
        ${UbicacionesColumns.LATITUD} AS latitud,
        ${UbicacionesColumns.LONGITUD} AS longitud
       FROM ${Tables.UBICACIONES}
       WHERE ${UbicacionesColumns.ORGANIZACION_ID} = ?`,
      [orgId],
    );

    return row ? mapUbicacionRow(row) : null;
  }

  async listarNiveles(): Promise<OrganizacionNivel[]> {
    const rows = await this.db.getAllAsync<Parameters<typeof mapOrganizacionNivelRow>[0]>(
      `SELECT
        ${OrganizacionNivelesColumns.ID} AS id,
        ${OrganizacionNivelesColumns.CODIGO} AS codigo,
        ${OrganizacionNivelesColumns.NOMBRE} AS nombre,
        ${OrganizacionNivelesColumns.NIVEL_ORDEN} AS nivel_orden,
        ${OrganizacionNivelesColumns.ES_HOJA} AS es_hoja,
        ${OrganizacionNivelesColumns.ACTIVO} AS activo
       FROM ${Tables.ORGANIZACION_NIVELES}
       WHERE ${OrganizacionNivelesColumns.ACTIVO} = 1
       ORDER BY ${OrganizacionNivelesColumns.NIVEL_ORDEN} DESC`,
    );

    return rows.map(mapOrganizacionNivelRow);
  }

  async obtenerNivelPorId(nivelId: string): Promise<OrganizacionNivel | null> {
    const row = await this.db.getFirstAsync<Parameters<typeof mapOrganizacionNivelRow>[0]>(
      `SELECT
        ${OrganizacionNivelesColumns.ID} AS id,
        ${OrganizacionNivelesColumns.CODIGO} AS codigo,
        ${OrganizacionNivelesColumns.NOMBRE} AS nombre,
        ${OrganizacionNivelesColumns.NIVEL_ORDEN} AS nivel_orden,
        ${OrganizacionNivelesColumns.ES_HOJA} AS es_hoja,
        ${OrganizacionNivelesColumns.ACTIVO} AS activo
       FROM ${Tables.ORGANIZACION_NIVELES}
       WHERE ${OrganizacionNivelesColumns.ID} = ?`,
      [nivelId],
    );

    return row ? mapOrganizacionNivelRow(row) : null;
  }

  async listarHijosDirectos(parentId: string | null): Promise<Organizacion[]> {
    const rows = await this.db.getAllAsync<Parameters<typeof mapOrganizacionRow>[0]>(
      parentId === null
        ? `SELECT ${orgSelect('o')}
           FROM ${Tables.ORGANIZACIONES} o
           WHERE o.${OrganizacionesColumns.PARENT_ID} IS NULL
             AND o.${OrganizacionesColumns.DELETED_AT} IS NULL
             AND o.${OrganizacionesColumns.ACTIVO} = 1
           ORDER BY o.${OrganizacionesColumns.NOMBRE} ASC`
        : `SELECT ${orgSelect('o')}
           FROM ${Tables.ORGANIZACIONES} o
           WHERE o.${OrganizacionesColumns.PARENT_ID} = ?
             AND o.${OrganizacionesColumns.DELETED_AT} IS NULL
             AND o.${OrganizacionesColumns.ACTIVO} = 1
           ORDER BY o.${OrganizacionesColumns.NOMBRE} ASC`,
      parentId === null ? [] : [parentId],
    );

    return rows.map(mapOrganizacionRow);
  }

  async obtenerSubarbol(rootId: string): Promise<Organizacion[]> {
    const rows = await this.db.getAllAsync<Parameters<typeof mapOrganizacionRow>[0]>(
      `WITH RECURSIVE subtree AS (
        SELECT ${orgSelect('o')}
        FROM ${Tables.ORGANIZACIONES} o
        WHERE o.${OrganizacionesColumns.ID} = ?
          AND o.${OrganizacionesColumns.DELETED_AT} IS NULL
        UNION ALL
        SELECT ${orgSelect('c')}
        FROM ${Tables.ORGANIZACIONES} c
        INNER JOIN subtree s ON c.${OrganizacionesColumns.PARENT_ID} = s.id
        WHERE c.${OrganizacionesColumns.DELETED_AT} IS NULL
      )
      SELECT * FROM subtree
      ORDER BY nombre ASC`,
      [rootId],
    );

    return rows.map(mapOrganizacionRow);
  }

  async guardar(organizacion: Organizacion, ubicacion?: Ubicacion): Promise<void> {
    const now = new Date().toISOString();

    await this.db.withExclusiveTransactionAsync(async (txn) => {
      await txn.runAsync(
        `INSERT INTO ${Tables.ORGANIZACIONES} (
          ${OrganizacionesColumns.ID},
          ${OrganizacionesColumns.NIVEL_ID},
          ${OrganizacionesColumns.PARENT_ID},
          ${OrganizacionesColumns.NOMBRE},
          ${OrganizacionesColumns.CODIGO_INTERNO},
          ${OrganizacionesColumns.DESCRIPCION},
          ${OrganizacionesColumns.ACTIVO},
          ${OrganizacionesColumns.SYNC_VECTOR},
          ${OrganizacionesColumns.UPDATED_AT},
          ${OrganizacionesColumns.UPDATED_BY_DEVICE}
        ) VALUES (?, ?, ?, ?, ?, ?, ?, '{}', ?, '')
        ON CONFLICT(${OrganizacionesColumns.ID}) DO UPDATE SET
          ${OrganizacionesColumns.NIVEL_ID} = excluded.${OrganizacionesColumns.NIVEL_ID},
          ${OrganizacionesColumns.PARENT_ID} = excluded.${OrganizacionesColumns.PARENT_ID},
          ${OrganizacionesColumns.NOMBRE} = excluded.${OrganizacionesColumns.NOMBRE},
          ${OrganizacionesColumns.CODIGO_INTERNO} = excluded.${OrganizacionesColumns.CODIGO_INTERNO},
          ${OrganizacionesColumns.DESCRIPCION} = excluded.${OrganizacionesColumns.DESCRIPCION},
          ${OrganizacionesColumns.ACTIVO} = excluded.${OrganizacionesColumns.ACTIVO},
          ${OrganizacionesColumns.UPDATED_AT} = excluded.${OrganizacionesColumns.UPDATED_AT}`,
        [
          organizacion.id,
          organizacion.nivelId,
          organizacion.parentId,
          organizacion.nombre,
          organizacion.codigoInterno,
          organizacion.descripcion,
          organizacion.activo ? 1 : 0,
          now,
        ],
      );

      if (ubicacion) {
        await txn.runAsync(
          `INSERT INTO ${Tables.UBICACIONES} (
            ${UbicacionesColumns.ID},
            ${UbicacionesColumns.ORGANIZACION_ID},
            ${UbicacionesColumns.DIRECCION},
            ${UbicacionesColumns.CIUDAD},
            ${UbicacionesColumns.PROVINCIA},
            ${UbicacionesColumns.PAIS},
            ${UbicacionesColumns.LATITUD},
            ${UbicacionesColumns.LONGITUD},
            ${UbicacionesColumns.UPDATED_AT}
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(${UbicacionesColumns.ORGANIZACION_ID}) DO UPDATE SET
            ${UbicacionesColumns.DIRECCION} = excluded.${UbicacionesColumns.DIRECCION},
            ${UbicacionesColumns.CIUDAD} = excluded.${UbicacionesColumns.CIUDAD},
            ${UbicacionesColumns.PROVINCIA} = excluded.${UbicacionesColumns.PROVINCIA},
            ${UbicacionesColumns.PAIS} = excluded.${UbicacionesColumns.PAIS},
            ${UbicacionesColumns.LATITUD} = excluded.${UbicacionesColumns.LATITUD},
            ${UbicacionesColumns.LONGITUD} = excluded.${UbicacionesColumns.LONGITUD},
            ${UbicacionesColumns.UPDATED_AT} = excluded.${UbicacionesColumns.UPDATED_AT}`,
          [
            ubicacion.id,
            ubicacion.organizacionId,
            ubicacion.direccion,
            ubicacion.ciudad,
            ubicacion.provincia,
            ubicacion.pais,
            ubicacion.latitud,
            ubicacion.longitud,
            now,
          ],
        );
      }
    });
  }

  async eliminarLogico(id: string, deviceId: string, lamportClock: number): Promise<void> {
    const now = new Date().toISOString();
    const syncVector = JSON.stringify({ [deviceId]: lamportClock });

    await this.db.runAsync(
      `UPDATE ${Tables.ORGANIZACIONES}
       SET ${OrganizacionesColumns.DELETED_AT} = ?,
           ${OrganizacionesColumns.UPDATED_AT} = ?,
           ${OrganizacionesColumns.UPDATED_BY_DEVICE} = ?,
           ${OrganizacionesColumns.SYNC_VECTOR} = ?,
           ${OrganizacionesColumns.ACTIVO} = 0
       WHERE ${OrganizacionesColumns.ID} = ?`,
      [now, now, deviceId, syncVector, id],
    );
  }
}
