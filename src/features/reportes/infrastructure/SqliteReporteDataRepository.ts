import type { SQLiteDatabase } from 'expo-sqlite';

import {
  BienEstado,
  BienesColumns,
  CategoriasBienColumns,
  Indexes,
  InventarioAggregatesColumns,
  OfrendasColumns,
  OrganizacionNivelesColumns,
  OrganizacionesColumns,
  Tables,
  TiposActividadColumns,
  UbicacionesColumns,
} from '@/shared/infrastructure/database/schema';

import type {
  BienExportRow,
  OfrendaExportRow,
  OrgExportRow,
  ReporteExportData,
  ResumenOrgRow,
} from '../domain/entities/ReporteExportData';
import type { IReporteDataRepository, ReporteDataFiltros } from '../domain/repositories/IReporteDataRepository';

type OrgRow = {
  id: string;
  codigo_interno: string;
  nombre: string;
  nivel_nombre: string;
  nivel_orden: number;
  parent_codigo: string | null;
  parent_nombre: string | null;
  activo: number;
  ciudad: string | null;
  provincia: string | null;
};

type BienRow = {
  id: string;
  organizacion_id: string;
  categoria_id: string;
  org_codigo: string;
  org_nombre: string;
  categoria: string;
  nombre: string;
  descripcion: string | null;
  estado: string;
  cantidad: number;
  valor_estimado: number;
  observaciones: string | null;
  updated_at: string;
};

type OfrendaRow = {
  id: string;
  organizacion_id: string;
  tipo_actividad_id: string;
  org_codigo: string;
  org_nombre: string;
  tipo_actividad: string;
  monto: number;
  fecha: string;
  descripcion: string | null;
  updated_at: string;
};

type AggregateRow = {
  organizacion_id: string;
  org_codigo: string;
  org_nombre: string;
  nivel_nombre: string;
  total_bienes: number;
  total_bienes_por_estado: string;
  total_ofrendas: number;
  total_ofrendas_por_tipo: string;
  calculado_at: string | null;
};

type ValorInventarioRow = {
  organizacion_id: string;
  valor_total: number;
};

function parseJsonRecord(raw: string): Record<string, number> {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        result[key] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function estadoCantidad(porEstado: Record<string, number>, estado: string): number {
  return porEstado[estado] ?? 0;
}

export class SqliteReporteDataRepository implements IReporteDataRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async cargarDatos(organizacionIds: string[], filtros?: ReporteDataFiltros): Promise<ReporteExportData> {
    if (organizacionIds.length === 0) {
      return {
        organizaciones: [],
        bienes: [],
        ofrendas: [],
        resumen: [],
        catalogoTiposActividad: [],
      };
    }

    const placeholders = organizacionIds.map(() => '?').join(', ');

    const [organizaciones, bienes, ofrendas, aggregates, valoresInventario, tiposRows] = await Promise.all([
      this.cargarOrganizaciones(placeholders, organizacionIds),
      this.cargarBienes(placeholders, organizacionIds),
      this.cargarOfrendas(placeholders, organizacionIds, filtros),
      this.cargarAggregates(placeholders, organizacionIds),
      this.cargarValoresInventario(placeholders, organizacionIds),
      this.db.getAllAsync<{
        id: string;
        codigo: string;
        nombre: string;
        activo: number;
        updated_at: string;
      }>(
        `SELECT
          ${TiposActividadColumns.ID} AS id,
          ${TiposActividadColumns.CODIGO} AS codigo,
          ${TiposActividadColumns.NOMBRE} AS nombre,
          ${TiposActividadColumns.ACTIVO} AS activo,
          ${TiposActividadColumns.UPDATED_AT} AS updated_at
         FROM ${Tables.TIPOS_ACTIVIDAD}
         WHERE ${TiposActividadColumns.ACTIVO} = 1
         ORDER BY ${TiposActividadColumns.NOMBRE} COLLATE NOCASE ASC`,
      ),
    ]);

    const valorPorOrg = new Map(valoresInventario.map((row) => [row.organizacion_id, row.valor_total]));
    const resumen = this.construirResumen(aggregates, valorPorOrg);
    const catalogoTiposActividad = tiposRows.map((row) => ({
      id: row.id,
      codigo: row.codigo,
      nombre: row.nombre,
      activo: row.activo === 1,
      updatedAt: row.updated_at,
    }));

    return { organizaciones, bienes, ofrendas, resumen, catalogoTiposActividad };
  }

  private async cargarOrganizaciones(placeholders: string, orgIds: string[]): Promise<OrgExportRow[]> {
    const rows = await this.db.getAllAsync<OrgRow>(
      `SELECT
        o.${OrganizacionesColumns.ID} AS id,
        o.${OrganizacionesColumns.CODIGO_INTERNO} AS codigo_interno,
        o.${OrganizacionesColumns.NOMBRE} AS nombre,
        n.${OrganizacionNivelesColumns.NOMBRE} AS nivel_nombre,
        n.${OrganizacionNivelesColumns.NIVEL_ORDEN} AS nivel_orden,
        p.${OrganizacionesColumns.CODIGO_INTERNO} AS parent_codigo,
        p.${OrganizacionesColumns.NOMBRE} AS parent_nombre,
        o.${OrganizacionesColumns.ACTIVO} AS activo,
        u.${UbicacionesColumns.CIUDAD} AS ciudad,
        u.${UbicacionesColumns.PROVINCIA} AS provincia
       FROM ${Tables.ORGANIZACIONES} o
       INNER JOIN ${Tables.ORGANIZACION_NIVELES} n
         ON n.${OrganizacionNivelesColumns.ID} = o.${OrganizacionesColumns.NIVEL_ID}
       LEFT JOIN ${Tables.ORGANIZACIONES} p
         ON p.${OrganizacionesColumns.ID} = o.${OrganizacionesColumns.PARENT_ID}
       LEFT JOIN ${Tables.UBICACIONES} u
         ON u.${UbicacionesColumns.ORGANIZACION_ID} = o.${OrganizacionesColumns.ID}
       WHERE o.${OrganizacionesColumns.ID} IN (${placeholders})
         AND o.${OrganizacionesColumns.DELETED_AT} IS NULL
       ORDER BY n.${OrganizacionNivelesColumns.NIVEL_ORDEN} DESC,
                o.${OrganizacionesColumns.NOMBRE} COLLATE NOCASE ASC`,
      orgIds,
    );

    return rows.map((row) => ({
      id: row.id,
      codigoInterno: row.codigo_interno,
      nombre: row.nombre,
      nivelNombre: row.nivel_nombre,
      nivelOrden: row.nivel_orden,
      parentCodigo: row.parent_codigo,
      parentNombre: row.parent_nombre,
      activo: row.activo === 1,
      ciudad: row.ciudad,
      provincia: row.provincia,
    }));
  }

  private async cargarBienes(placeholders: string, orgIds: string[]): Promise<BienExportRow[]> {
    const rows = await this.db.getAllAsync<BienRow>(
      `SELECT
        b.${BienesColumns.ID} AS id,
        b.${BienesColumns.ORGANIZACION_ID} AS organizacion_id,
        b.${BienesColumns.CATEGORIA_ID} AS categoria_id,
        o.${OrganizacionesColumns.CODIGO_INTERNO} AS org_codigo,
        o.${OrganizacionesColumns.NOMBRE} AS org_nombre,
        c.${CategoriasBienColumns.NOMBRE} AS categoria,
        b.${BienesColumns.NOMBRE} AS nombre,
        b.${BienesColumns.DESCRIPCION} AS descripcion,
        b.${BienesColumns.ESTADO} AS estado,
        b.${BienesColumns.CANTIDAD} AS cantidad,
        b.${BienesColumns.VALOR_ESTIMADO} AS valor_estimado,
        b.${BienesColumns.OBSERVACIONES} AS observaciones,
        b.${BienesColumns.UPDATED_AT} AS updated_at
       FROM ${Tables.BIENES} b
       INNER JOIN ${Tables.ORGANIZACIONES} o
         ON o.${OrganizacionesColumns.ID} = b.${BienesColumns.ORGANIZACION_ID}
       INNER JOIN ${Tables.CATEGORIAS_BIEN} c
         ON c.${CategoriasBienColumns.ID} = b.${BienesColumns.CATEGORIA_ID}
       WHERE b.${BienesColumns.ORGANIZACION_ID} IN (${placeholders})
         AND b.${BienesColumns.DELETED_AT} IS NULL
       ORDER BY o.${OrganizacionesColumns.NOMBRE} COLLATE NOCASE ASC,
                b.${BienesColumns.NOMBRE} COLLATE NOCASE ASC`,
      orgIds,
    );

    return rows.map((row) => {
      const valorTotal = row.cantidad * row.valor_estimado;
      return {
        id: row.id,
        organizacionId: row.organizacion_id,
        categoriaId: row.categoria_id,
        orgCodigo: row.org_codigo,
        orgNombre: row.org_nombre,
        categoria: row.categoria,
        nombre: row.nombre,
        descripcion: row.descripcion,
        estado: row.estado,
        cantidad: row.cantidad,
        valorEstimado: row.valor_estimado,
        valorTotal,
        observaciones: row.observaciones,
        updatedAt: row.updated_at,
      };
    });
  }

  private async cargarOfrendas(
    placeholders: string,
    orgIds: string[],
    filtros?: ReporteDataFiltros,
  ): Promise<OfrendaExportRow[]> {
    const conditions = [
      `o.${OfrendasColumns.ORGANIZACION_ID} IN (${placeholders})`,
      `o.${OfrendasColumns.DELETED_AT} IS NULL`,
    ];
    const params: string[] = [...orgIds];

    if (filtros?.fechaInicio) {
      conditions.push(`o.${OfrendasColumns.FECHA} >= ?`);
      params.push(filtros.fechaInicio);
    }

    if (filtros?.fechaFin) {
      conditions.push(`o.${OfrendasColumns.FECHA} <= ?`);
      params.push(filtros.fechaFin);
    }

    const rows = await this.db.getAllAsync<OfrendaRow>(
      `SELECT
        o.${OfrendasColumns.ID} AS id,
        o.${OfrendasColumns.ORGANIZACION_ID} AS organizacion_id,
        o.${OfrendasColumns.TIPO_ACTIVIDAD_ID} AS tipo_actividad_id,
        org.${OrganizacionesColumns.CODIGO_INTERNO} AS org_codigo,
        org.${OrganizacionesColumns.NOMBRE} AS org_nombre,
        t.${TiposActividadColumns.NOMBRE} AS tipo_actividad,
        o.${OfrendasColumns.MONTO} AS monto,
        o.${OfrendasColumns.FECHA} AS fecha,
        o.${OfrendasColumns.DESCRIPCION} AS descripcion,
        o.${OfrendasColumns.UPDATED_AT} AS updated_at
       FROM ${Tables.OFRENDAS} o
       INNER JOIN ${Tables.ORGANIZACIONES} org
         ON org.${OrganizacionesColumns.ID} = o.${OfrendasColumns.ORGANIZACION_ID}
       INNER JOIN ${Tables.TIPOS_ACTIVIDAD} t
         ON t.${TiposActividadColumns.ID} = o.${OfrendasColumns.TIPO_ACTIVIDAD_ID}
       INDEXED BY ${Indexes.OFRENDAS_ORGANIZACION_FECHA}
       WHERE ${conditions.join(' AND ')}
       ORDER BY o.${OfrendasColumns.FECHA} DESC,
                org.${OrganizacionesColumns.NOMBRE} COLLATE NOCASE ASC`,
      params,
    );

    return rows.map((row) => ({
      id: row.id,
      organizacionId: row.organizacion_id,
      tipoActividadId: row.tipo_actividad_id,
      orgCodigo: row.org_codigo,
      orgNombre: row.org_nombre,
      tipoActividad: row.tipo_actividad,
      monto: row.monto,
      fecha: row.fecha,
      descripcion: row.descripcion,
      updatedAt: row.updated_at,
    }));
  }

  private async cargarAggregates(placeholders: string, orgIds: string[]): Promise<AggregateRow[]> {
    return this.db.getAllAsync<AggregateRow>(
      `SELECT
        a.${InventarioAggregatesColumns.ORGANIZACION_ID} AS organizacion_id,
        o.${OrganizacionesColumns.CODIGO_INTERNO} AS org_codigo,
        o.${OrganizacionesColumns.NOMBRE} AS org_nombre,
        n.${OrganizacionNivelesColumns.NOMBRE} AS nivel_nombre,
        a.${InventarioAggregatesColumns.TOTAL_BIENES} AS total_bienes,
        a.${InventarioAggregatesColumns.TOTAL_BIENES_POR_ESTADO} AS total_bienes_por_estado,
        a.${InventarioAggregatesColumns.TOTAL_OFRENDAS} AS total_ofrendas,
        a.${InventarioAggregatesColumns.TOTAL_OFRENDAS_POR_TIPO} AS total_ofrendas_por_tipo,
        a.${InventarioAggregatesColumns.CALCULADO_AT} AS calculado_at
       FROM ${Tables.INVENTARIO_AGGREGATES} a
       INNER JOIN ${Tables.ORGANIZACIONES} o
         ON o.${OrganizacionesColumns.ID} = a.${InventarioAggregatesColumns.ORGANIZACION_ID}
       INNER JOIN ${Tables.ORGANIZACION_NIVELES} n
         ON n.${OrganizacionNivelesColumns.ID} = o.${OrganizacionesColumns.NIVEL_ID}
       WHERE a.${InventarioAggregatesColumns.ORGANIZACION_ID} IN (${placeholders})
       ORDER BY n.${OrganizacionNivelesColumns.NIVEL_ORDEN} DESC,
                o.${OrganizacionesColumns.NOMBRE} COLLATE NOCASE ASC`,
      orgIds,
    );
  }

  private async cargarValoresInventario(
    placeholders: string,
    orgIds: string[],
  ): Promise<ValorInventarioRow[]> {
    return this.db.getAllAsync<ValorInventarioRow>(
      `SELECT
        b.${BienesColumns.ORGANIZACION_ID} AS organizacion_id,
        SUM(b.${BienesColumns.CANTIDAD} * b.${BienesColumns.VALOR_ESTIMADO}) AS valor_total
       FROM ${Tables.BIENES} b
       WHERE b.${BienesColumns.ORGANIZACION_ID} IN (${placeholders})
         AND b.${BienesColumns.DELETED_AT} IS NULL
       GROUP BY b.${BienesColumns.ORGANIZACION_ID}`,
      orgIds,
    );
  }

  private construirResumen(
    aggregates: AggregateRow[],
    valorPorOrg: Map<string, number>,
  ): ResumenOrgRow[] {
    return aggregates.map((row) => {
      const porEstado = parseJsonRecord(row.total_bienes_por_estado);
      const porTipo = parseJsonRecord(row.total_ofrendas_por_tipo);

      return {
        orgCodigo: row.org_codigo,
        orgNombre: row.org_nombre,
        nivel: row.nivel_nombre,
        totalBienes: row.total_bienes,
        bienesExcelente: estadoCantidad(porEstado, BienEstado.EXCELENTE),
        bienesBueno: estadoCantidad(porEstado, BienEstado.BUENO),
        bienesRegular: estadoCantidad(porEstado, BienEstado.REGULAR),
        bienesMalo: estadoCantidad(porEstado, BienEstado.MALO),
        valorInventarioEstimado: valorPorOrg.get(row.organizacion_id) ?? 0,
        totalOfrendas: row.total_ofrendas,
        ofrendasPorTipo: porTipo,
        calculadoAt: row.calculado_at,
      };
    });
  }
}
