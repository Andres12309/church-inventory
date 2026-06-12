import type { SQLiteDatabase } from 'expo-sqlite';

import {
  BienesColumns,
  CategoriasBienColumns,
  Tables,
} from '@/shared/infrastructure/database/schema';

import type { Bien } from '../domain/entities/Bien';
import type { BienFiltros, IBienRepository } from '../domain/repositories/IBienRepository';
import { mapBienRow, mapCategoriaBienRow, type BienRow } from './BienMapper';

const bienSelect = `
  b.${BienesColumns.ID} AS id,
  b.${BienesColumns.ORGANIZACION_ID} AS organizacion_id,
  b.${BienesColumns.CATEGORIA_ID} AS categoria_id,
  b.${BienesColumns.NOMBRE} AS nombre,
  b.${BienesColumns.DESCRIPCION} AS descripcion,
  b.${BienesColumns.ESTADO} AS estado,
  b.${BienesColumns.CANTIDAD} AS cantidad,
  b.${BienesColumns.VALOR_ESTIMADO} AS valor_estimado,
  b.${BienesColumns.FOTO_URI} AS foto_uri,
  b.${BienesColumns.OBSERVACIONES} AS observaciones,
  b.${BienesColumns.SYNC_VECTOR} AS sync_vector,
  b.${BienesColumns.UPDATED_AT} AS updated_at,
  b.${BienesColumns.UPDATED_BY_DEVICE} AS updated_by_device,
  b.${BienesColumns.DELETED_AT} AS deleted_at
`;

export class SqliteBienRepository implements IBienRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async obtenerPorId(id: string): Promise<Bien | null> {
    const row = await this.db.getFirstAsync<BienRow>(
      `SELECT ${bienSelect}
       FROM ${Tables.BIENES} b
       WHERE b.${BienesColumns.ID} = ?
         AND b.${BienesColumns.DELETED_AT} IS NULL`,
      [id],
    );

    return row ? mapBienRow(row) : null;
  }

  async listarPorOrganizacion(orgId: string, filtros?: BienFiltros): Promise<Bien[]> {
    const conditions = [
      `b.${BienesColumns.ORGANIZACION_ID} = ?`,
      `b.${BienesColumns.DELETED_AT} IS NULL`,
    ];
    const params: (string | number)[] = [orgId];

    if (filtros?.categoriaId) {
      conditions.push(`b.${BienesColumns.CATEGORIA_ID} = ?`);
      params.push(filtros.categoriaId);
    }

    if (filtros?.estado) {
      conditions.push(`b.${BienesColumns.ESTADO} = ?`);
      params.push(filtros.estado);
    }

    if (filtros?.busqueda?.trim()) {
      conditions.push(`b.${BienesColumns.NOMBRE} LIKE ?`);
      params.push(`%${filtros.busqueda.trim()}%`);
    }

    const rows = await this.db.getAllAsync<BienRow>(
      `SELECT ${bienSelect}
       FROM ${Tables.BIENES} b
       WHERE ${conditions.join(' AND ')}
       ORDER BY b.${BienesColumns.NOMBRE} COLLATE NOCASE ASC`,
      params,
    );

    return rows.map(mapBienRow);
  }

  async listarCategorias() {
    const rows = await this.db.getAllAsync<Parameters<typeof mapCategoriaBienRow>[0]>(
      `SELECT
        ${CategoriasBienColumns.ID} AS id,
        ${CategoriasBienColumns.CODIGO} AS codigo,
        ${CategoriasBienColumns.NOMBRE} AS nombre,
        ${CategoriasBienColumns.ACTIVO} AS activo
       FROM ${Tables.CATEGORIAS_BIEN}
       WHERE ${CategoriasBienColumns.ACTIVO} = 1
       ORDER BY ${CategoriasBienColumns.NOMBRE} COLLATE NOCASE ASC`,
    );

    return rows.map(mapCategoriaBienRow);
  }

  async guardar(bien: Bien): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO ${Tables.BIENES} (
        ${BienesColumns.ID},
        ${BienesColumns.ORGANIZACION_ID},
        ${BienesColumns.CATEGORIA_ID},
        ${BienesColumns.NOMBRE},
        ${BienesColumns.DESCRIPCION},
        ${BienesColumns.ESTADO},
        ${BienesColumns.CANTIDAD},
        ${BienesColumns.VALOR_ESTIMADO},
        ${BienesColumns.FOTO_URI},
        ${BienesColumns.OBSERVACIONES},
        ${BienesColumns.SYNC_VECTOR},
        ${BienesColumns.UPDATED_AT},
        ${BienesColumns.UPDATED_BY_DEVICE}
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(${BienesColumns.ID}) DO UPDATE SET
        ${BienesColumns.ORGANIZACION_ID} = excluded.${BienesColumns.ORGANIZACION_ID},
        ${BienesColumns.CATEGORIA_ID} = excluded.${BienesColumns.CATEGORIA_ID},
        ${BienesColumns.NOMBRE} = excluded.${BienesColumns.NOMBRE},
        ${BienesColumns.DESCRIPCION} = excluded.${BienesColumns.DESCRIPCION},
        ${BienesColumns.ESTADO} = excluded.${BienesColumns.ESTADO},
        ${BienesColumns.CANTIDAD} = excluded.${BienesColumns.CANTIDAD},
        ${BienesColumns.VALOR_ESTIMADO} = excluded.${BienesColumns.VALOR_ESTIMADO},
        ${BienesColumns.FOTO_URI} = excluded.${BienesColumns.FOTO_URI},
        ${BienesColumns.OBSERVACIONES} = excluded.${BienesColumns.OBSERVACIONES},
        ${BienesColumns.UPDATED_AT} = excluded.${BienesColumns.UPDATED_AT},
        ${BienesColumns.UPDATED_BY_DEVICE} = excluded.${BienesColumns.UPDATED_BY_DEVICE}`,
      [
        bien.id,
        bien.organizacionId,
        bien.categoriaId,
        bien.nombre,
        bien.descripcion,
        bien.estado,
        bien.cantidad,
        bien.valorEstimado,
        bien.fotoUri,
        bien.observaciones,
        bien.syncVector,
        bien.updatedAt,
        bien.updatedByDevice,
      ],
    );
  }

  async eliminarLogico(id: string, deviceId: string, lamportClock: number): Promise<void> {
    const now = new Date().toISOString();
    const syncVector = JSON.stringify({ [deviceId]: lamportClock });

    await this.db.runAsync(
      `UPDATE ${Tables.BIENES}
       SET ${BienesColumns.DELETED_AT} = ?,
           ${BienesColumns.UPDATED_AT} = ?,
           ${BienesColumns.UPDATED_BY_DEVICE} = ?,
           ${BienesColumns.SYNC_VECTOR} = ?
       WHERE ${BienesColumns.ID} = ?`,
      [now, now, deviceId, syncVector, id],
    );
  }
}
