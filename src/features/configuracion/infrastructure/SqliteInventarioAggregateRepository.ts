import type { SQLiteDatabase } from 'expo-sqlite';

import {
  InventarioAggregatesColumns,
  Tables,
} from '@/shared/infrastructure/database/schema';

import type { InventarioAggregate } from '../domain/entities/InventarioAggregate';
import type { IInventarioAggregateRepository } from '../domain/repositories/IInventarioAggregateRepository';
import { mapAggregateRow, type AggregateRow } from './InventarioAggregateMapper';

const aggregateSelect = `
  ${InventarioAggregatesColumns.ORGANIZACION_ID} AS organizacion_id,
  ${InventarioAggregatesColumns.TOTAL_BIENES} AS total_bienes,
  ${InventarioAggregatesColumns.TOTAL_BIENES_POR_ESTADO} AS total_bienes_por_estado,
  ${InventarioAggregatesColumns.TOTAL_OFRENDAS} AS total_ofrendas,
  ${InventarioAggregatesColumns.TOTAL_OFRENDAS_POR_TIPO} AS total_ofrendas_por_tipo,
  ${InventarioAggregatesColumns.CALCULADO_AT} AS calculado_at
`;

export class SqliteInventarioAggregateRepository implements IInventarioAggregateRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async obtenerPorOrganizacionId(organizacionId: string): Promise<InventarioAggregate | null> {
    const row = await this.db.getFirstAsync<AggregateRow>(
      `SELECT ${aggregateSelect}
       FROM ${Tables.INVENTARIO_AGGREGATES}
       WHERE ${InventarioAggregatesColumns.ORGANIZACION_ID} = ?`,
      [organizacionId],
    );

    return row ? mapAggregateRow(row) : null;
  }

  async listarPorOrganizacionIds(organizacionIds: string[]): Promise<InventarioAggregate[]> {
    if (organizacionIds.length === 0) {
      return [];
    }

    const placeholders = organizacionIds.map(() => '?').join(', ');
    const rows = await this.db.getAllAsync<AggregateRow>(
      `SELECT ${aggregateSelect}
       FROM ${Tables.INVENTARIO_AGGREGATES}
       WHERE ${InventarioAggregatesColumns.ORGANIZACION_ID} IN (${placeholders})`,
      organizacionIds,
    );

    return rows.map(mapAggregateRow);
  }
}
