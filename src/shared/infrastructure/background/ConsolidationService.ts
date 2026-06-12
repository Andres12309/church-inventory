import type { SQLiteDatabase } from 'expo-sqlite';

import type { IConsolidationService } from '@/features/configuracion/domain/services/IConsolidationService';
import {
  BienesColumns,
  InventarioAggregatesColumns,
  OfrendasColumns,
  OrganizacionNivelesColumns,
  OrganizacionesColumns,
  Tables,
} from '@/shared/infrastructure/database/schema';

import type { InventarioAggregate } from '@/features/configuracion/domain/entities/InventarioAggregate';
import {
  mapAggregateRow,
  mergeJsonRecords,
  serializarJsonRecord,
  type AggregateRow,
} from '@/features/configuracion/infrastructure/InventarioAggregateMapper';
import { withSqliteLockRetry } from '@/shared/infrastructure/database/sqliteRetry';

type BienesEstadoRow = { estado: string; total: number };
type OfrendasTipoRow = { tipo_actividad_id: string; total: number };

export class ConsolidationService implements IConsolidationService {
  private consolidationQueue: Promise<void> = Promise.resolve();

  constructor(private readonly db: SQLiteDatabase) {}

  async consolidarNodo(orgId: string): Promise<void> {
    await this.enqueueConsolidation(() => this.consolidarNodoInternal(orgId));
  }

  async consolidarTodoElArbol(): Promise<void> {
    await this.enqueueConsolidation(() => this.consolidarTodoElArbolInternal());
  }

  private enqueueConsolidation(fn: () => Promise<void>): Promise<void> {
    const run = this.consolidationQueue.then(fn);
    this.consolidationQueue = run.catch(() => undefined);
    return run;
  }

  private async consolidarNodoInternal(orgId: string): Promise<void> {
    await this.materializarNodo(orgId);

    const parentRow = await this.db.getFirstAsync<{ parent_id: string | null }>(
      `SELECT ${OrganizacionesColumns.PARENT_ID} AS parent_id
       FROM ${Tables.ORGANIZACIONES}
       WHERE ${OrganizacionesColumns.ID} = ?
         AND ${OrganizacionesColumns.DELETED_AT} IS NULL`,
      [orgId],
    );

    if (parentRow?.parent_id) {
      await this.consolidarNodoInternal(parentRow.parent_id);
    }
  }

  private async consolidarTodoElArbolInternal(): Promise<void> {
    const nodos = await this.db.getAllAsync<{ id: string }>(
      `SELECT o.${OrganizacionesColumns.ID} AS id
       FROM ${Tables.ORGANIZACIONES} o
       INNER JOIN ${Tables.ORGANIZACION_NIVELES} n
         ON n.${OrganizacionNivelesColumns.ID} = o.${OrganizacionesColumns.NIVEL_ID}
       WHERE o.${OrganizacionesColumns.DELETED_AT} IS NULL
       ORDER BY n.${OrganizacionNivelesColumns.NIVEL_ORDEN} DESC`,
    );

    for (const nodo of nodos) {
      await this.materializarNodo(nodo.id);
    }
  }

  private async materializarNodo(orgId: string): Promise<void> {
    const bienesDirectos = await this.obtenerBienesDirectos(orgId);
    const ofrendasDirectas = await this.obtenerOfrendasDirectas(orgId);
    const hijosIds = await this.obtenerHijosDirectosIds(orgId);

    let totalBienes = bienesDirectos.total;
    let bienesPorEstado = { ...bienesDirectos.porEstado };
    let totalOfrendas = ofrendasDirectas.total;
    let ofrendasPorTipo = { ...ofrendasDirectas.porTipo };

    if (hijosIds.length > 0) {
      const placeholders = hijosIds.map(() => '?').join(', ');
      const agregadosHijos = await this.db.getAllAsync<AggregateRow>(
        `SELECT
          ${InventarioAggregatesColumns.ORGANIZACION_ID} AS organizacion_id,
          ${InventarioAggregatesColumns.TOTAL_BIENES} AS total_bienes,
          ${InventarioAggregatesColumns.TOTAL_BIENES_POR_ESTADO} AS total_bienes_por_estado,
          ${InventarioAggregatesColumns.TOTAL_OFRENDAS} AS total_ofrendas,
          ${InventarioAggregatesColumns.TOTAL_OFRENDAS_POR_TIPO} AS total_ofrendas_por_tipo,
          ${InventarioAggregatesColumns.CALCULADO_AT} AS calculado_at
         FROM ${Tables.INVENTARIO_AGGREGATES}
         WHERE ${InventarioAggregatesColumns.ORGANIZACION_ID} IN (${placeholders})`,
        hijosIds,
      );

      for (const row of agregadosHijos) {
        const hijo = mapAggregateRow(row);
        totalBienes += hijo.totalBienes;
        bienesPorEstado = mergeJsonRecords(
          bienesPorEstado,
          hijo.totalBienesPorEstado as Record<string, number>,
        );
        totalOfrendas = Math.round((totalOfrendas + hijo.totalOfrendas) * 100) / 100;
        ofrendasPorTipo = mergeJsonRecords(ofrendasPorTipo, hijo.totalOfrendasPorTipo);
      }
    }

    const calculadoAt = new Date().toISOString();
    await this.upsertAggregate({
      organizacionId: orgId,
      totalBienes,
      totalBienesPorEstado: bienesPorEstado,
      totalOfrendas,
      totalOfrendasPorTipo: ofrendasPorTipo,
      calculadoAt,
    });
  }

  private async obtenerBienesDirectos(orgId: string): Promise<{
    total: number;
    porEstado: Record<string, number>;
  }> {
    const rows = await this.db.getAllAsync<BienesEstadoRow>(
      `SELECT b.${BienesColumns.ESTADO} AS estado, SUM(b.${BienesColumns.CANTIDAD}) AS total
       FROM ${Tables.BIENES} b
       WHERE b.${BienesColumns.ORGANIZACION_ID} = ?
         AND b.${BienesColumns.DELETED_AT} IS NULL
       GROUP BY b.${BienesColumns.ESTADO}`,
      [orgId],
    );

    const porEstado: Record<string, number> = {};
    let total = 0;

    for (const row of rows) {
      porEstado[row.estado] = row.total;
      total += row.total;
    }

    return { total, porEstado };
  }

  private async obtenerOfrendasDirectas(orgId: string): Promise<{
    total: number;
    porTipo: Record<string, number>;
  }> {
    const rows = await this.db.getAllAsync<OfrendasTipoRow>(
      `SELECT o.${OfrendasColumns.TIPO_ACTIVIDAD_ID} AS tipo_actividad_id,
              SUM(o.${OfrendasColumns.MONTO}) AS total
       FROM ${Tables.OFRENDAS} o
       WHERE o.${OfrendasColumns.ORGANIZACION_ID} = ?
         AND o.${OfrendasColumns.DELETED_AT} IS NULL
       GROUP BY o.${OfrendasColumns.TIPO_ACTIVIDAD_ID}`,
      [orgId],
    );

    const porTipo: Record<string, number> = {};
    let total = 0;

    for (const row of rows) {
      const monto = Math.round(row.total * 100) / 100;
      porTipo[row.tipo_actividad_id] = monto;
      total = Math.round((total + monto) * 100) / 100;
    }

    return { total, porTipo };
  }

  private async obtenerHijosDirectosIds(orgId: string): Promise<string[]> {
    const rows = await this.db.getAllAsync<{ id: string }>(
      `SELECT ${OrganizacionesColumns.ID} AS id
       FROM ${Tables.ORGANIZACIONES}
       WHERE ${OrganizacionesColumns.PARENT_ID} = ?
         AND ${OrganizacionesColumns.DELETED_AT} IS NULL`,
      [orgId],
    );

    return rows.map((row) => row.id);
  }

  private async upsertAggregate(aggregate: InventarioAggregate): Promise<void> {
    await withSqliteLockRetry(async () => {
      await this.db.runAsync(
        `INSERT INTO ${Tables.INVENTARIO_AGGREGATES} (
          ${InventarioAggregatesColumns.ORGANIZACION_ID},
          ${InventarioAggregatesColumns.TOTAL_BIENES},
          ${InventarioAggregatesColumns.TOTAL_BIENES_POR_ESTADO},
          ${InventarioAggregatesColumns.TOTAL_OFRENDAS},
          ${InventarioAggregatesColumns.TOTAL_OFRENDAS_POR_TIPO},
          ${InventarioAggregatesColumns.CALCULADO_AT}
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(${InventarioAggregatesColumns.ORGANIZACION_ID}) DO UPDATE SET
          ${InventarioAggregatesColumns.TOTAL_BIENES} = excluded.${InventarioAggregatesColumns.TOTAL_BIENES},
          ${InventarioAggregatesColumns.TOTAL_BIENES_POR_ESTADO} = excluded.${InventarioAggregatesColumns.TOTAL_BIENES_POR_ESTADO},
          ${InventarioAggregatesColumns.TOTAL_OFRENDAS} = excluded.${InventarioAggregatesColumns.TOTAL_OFRENDAS},
          ${InventarioAggregatesColumns.TOTAL_OFRENDAS_POR_TIPO} = excluded.${InventarioAggregatesColumns.TOTAL_OFRENDAS_POR_TIPO},
          ${InventarioAggregatesColumns.CALCULADO_AT} = excluded.${InventarioAggregatesColumns.CALCULADO_AT}`,
        [
          aggregate.organizacionId,
          aggregate.totalBienes,
          serializarJsonRecord(aggregate.totalBienesPorEstado as Record<string, number>),
          aggregate.totalOfrendas,
          serializarJsonRecord(aggregate.totalOfrendasPorTipo),
          aggregate.calculadoAt,
        ],
      );
    });
  }
}
