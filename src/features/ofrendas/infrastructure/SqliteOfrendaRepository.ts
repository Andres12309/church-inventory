import type { SQLiteDatabase } from 'expo-sqlite';

import {
  Indexes,
  OfrendasColumns,
  Tables,
  TiposActividadColumns,
} from '@/shared/infrastructure/database/schema';

import type { Ofrenda } from '../domain/entities/Ofrenda';
import type { IOfrendaRepository, OfrendaFiltros } from '../domain/repositories/IOfrendaRepository';
import { mapOfrendaRow, mapTipoActividadRow, redondearMonto, type OfrendaRow } from './OfrendaMapper';

const ofrendaSelect = `
  o.${OfrendasColumns.ID} AS id,
  o.${OfrendasColumns.ORGANIZACION_ID} AS organizacion_id,
  o.${OfrendasColumns.TIPO_ACTIVIDAD_ID} AS tipo_actividad_id,
  o.${OfrendasColumns.MONTO} AS monto,
  o.${OfrendasColumns.FECHA} AS fecha,
  o.${OfrendasColumns.DESCRIPCION} AS descripcion,
  o.${OfrendasColumns.SYNC_VECTOR} AS sync_vector,
  o.${OfrendasColumns.UPDATED_AT} AS updated_at,
  o.${OfrendasColumns.UPDATED_BY_DEVICE} AS updated_by_device,
  o.${OfrendasColumns.DELETED_AT} AS deleted_at
`;

export class SqliteOfrendaRepository implements IOfrendaRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async obtenerPorId(id: string): Promise<Ofrenda | null> {
    const row = await this.db.getFirstAsync<OfrendaRow>(
      `SELECT ${ofrendaSelect}
       FROM ${Tables.OFRENDAS} o
       WHERE o.${OfrendasColumns.ID} = ?
         AND o.${OfrendasColumns.DELETED_AT} IS NULL`,
      [id],
    );

    return row ? mapOfrendaRow(row) : null;
  }

  async listarPorOrganizacion(orgId: string, filtros?: OfrendaFiltros): Promise<Ofrenda[]> {
    const conditions = [
      `o.${OfrendasColumns.ORGANIZACION_ID} = ?`,
      `o.${OfrendasColumns.DELETED_AT} IS NULL`,
    ];
    const params: string[] = [orgId];

    if (filtros?.tipoActividadId) {
      conditions.push(`o.${OfrendasColumns.TIPO_ACTIVIDAD_ID} = ?`);
      params.push(filtros.tipoActividadId);
    }

    if (filtros?.fechaInicio) {
      conditions.push(`o.${OfrendasColumns.FECHA} >= ?`);
      params.push(filtros.fechaInicio);
    }

    if (filtros?.fechaFin) {
      conditions.push(`o.${OfrendasColumns.FECHA} <= ?`);
      params.push(filtros.fechaFin);
    }

    const rows = await this.db.getAllAsync<OfrendaRow>(
      `SELECT ${ofrendaSelect}
       FROM ${Tables.OFRENDAS} o
       INDEXED BY ${Indexes.OFRENDAS_ORGANIZACION_FECHA}
       WHERE ${conditions.join(' AND ')}
       ORDER BY o.${OfrendasColumns.FECHA} DESC, o.${OfrendasColumns.UPDATED_AT} DESC`,
      params,
    );

    return rows.map(mapOfrendaRow);
  }

  async listarTiposActividad() {
    const rows = await this.db.getAllAsync<Parameters<typeof mapTipoActividadRow>[0]>(
      `SELECT
        ${TiposActividadColumns.ID} AS id,
        ${TiposActividadColumns.CODIGO} AS codigo,
        ${TiposActividadColumns.NOMBRE} AS nombre,
        ${TiposActividadColumns.ACTIVO} AS activo
       FROM ${Tables.TIPOS_ACTIVIDAD}
       WHERE ${TiposActividadColumns.ACTIVO} = 1
       ORDER BY ${TiposActividadColumns.NOMBRE} COLLATE NOCASE ASC`,
    );

    return rows.map(mapTipoActividadRow);
  }

  async guardar(ofrenda: Ofrenda): Promise<void> {
    const monto = redondearMonto(ofrenda.monto);

    await this.db.runAsync(
      `INSERT INTO ${Tables.OFRENDAS} (
        ${OfrendasColumns.ID},
        ${OfrendasColumns.ORGANIZACION_ID},
        ${OfrendasColumns.TIPO_ACTIVIDAD_ID},
        ${OfrendasColumns.MONTO},
        ${OfrendasColumns.FECHA},
        ${OfrendasColumns.DESCRIPCION},
        ${OfrendasColumns.SYNC_VECTOR},
        ${OfrendasColumns.UPDATED_AT},
        ${OfrendasColumns.UPDATED_BY_DEVICE}
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(${OfrendasColumns.ID}) DO UPDATE SET
        ${OfrendasColumns.ORGANIZACION_ID} = excluded.${OfrendasColumns.ORGANIZACION_ID},
        ${OfrendasColumns.TIPO_ACTIVIDAD_ID} = excluded.${OfrendasColumns.TIPO_ACTIVIDAD_ID},
        ${OfrendasColumns.MONTO} = excluded.${OfrendasColumns.MONTO},
        ${OfrendasColumns.FECHA} = excluded.${OfrendasColumns.FECHA},
        ${OfrendasColumns.DESCRIPCION} = excluded.${OfrendasColumns.DESCRIPCION},
        ${OfrendasColumns.UPDATED_AT} = excluded.${OfrendasColumns.UPDATED_AT},
        ${OfrendasColumns.UPDATED_BY_DEVICE} = excluded.${OfrendasColumns.UPDATED_BY_DEVICE}`,
      [
        ofrenda.id,
        ofrenda.organizacionId,
        ofrenda.tipoActividadId,
        monto,
        ofrenda.fecha,
        ofrenda.descripcion,
        ofrenda.syncVector,
        ofrenda.updatedAt,
        ofrenda.updatedByDevice,
      ],
    );
  }

  async eliminarLogico(id: string, deviceId: string, lamportClock: number): Promise<void> {
    const now = new Date().toISOString();
    const syncVector = JSON.stringify({ [deviceId]: lamportClock });

    await this.db.runAsync(
      `UPDATE ${Tables.OFRENDAS}
       SET ${OfrendasColumns.DELETED_AT} = ?,
           ${OfrendasColumns.UPDATED_AT} = ?,
           ${OfrendasColumns.UPDATED_BY_DEVICE} = ?,
           ${OfrendasColumns.SYNC_VECTOR} = ?
       WHERE ${OfrendasColumns.ID} = ?`,
      [now, now, deviceId, syncVector, id],
    );
  }
}
