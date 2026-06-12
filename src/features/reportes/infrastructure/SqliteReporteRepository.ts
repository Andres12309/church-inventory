import type { SQLiteDatabase } from 'expo-sqlite';

import {
  OrganizacionesColumns,
  ReportesGeneradosColumns,
  Tables,
} from '@/shared/infrastructure/database/schema';

import type { ReporteGenerado, ReporteTipo } from '../domain/entities/ReporteGenerado';
import type { IReporteRepository, RegistrarReporteInput } from '../domain/repositories/IReporteRepository';

type ReporteRow = {
  id: string;
  organizacion_id: string;
  org_nombre: string;
  tipo: ReporteTipo;
  file_uri: string;
  generado_at: string;
  generado_por_usuario_id: string | null;
};

export class SqliteReporteRepository implements IReporteRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async listarPorOrganizaciones(organizacionIds: string[]): Promise<ReporteGenerado[]> {
    if (organizacionIds.length === 0) {
      return [];
    }

    const placeholders = organizacionIds.map(() => '?').join(', ');
    const rows = await this.db.getAllAsync<ReporteRow>(
      `SELECT
        r.${ReportesGeneradosColumns.ID} AS id,
        r.${ReportesGeneradosColumns.ORGANIZACION_ID} AS organizacion_id,
        o.${OrganizacionesColumns.NOMBRE} AS org_nombre,
        r.${ReportesGeneradosColumns.TIPO} AS tipo,
        r.${ReportesGeneradosColumns.FILE_URI} AS file_uri,
        r.${ReportesGeneradosColumns.GENERADO_AT} AS generado_at,
        r.${ReportesGeneradosColumns.GENERADO_POR_USUARIO_ID} AS generado_por_usuario_id
       FROM ${Tables.REPORTES_GENERADOS} r
       INNER JOIN ${Tables.ORGANIZACIONES} o
         ON o.${OrganizacionesColumns.ID} = r.${ReportesGeneradosColumns.ORGANIZACION_ID}
       WHERE r.${ReportesGeneradosColumns.ORGANIZACION_ID} IN (${placeholders})
       ORDER BY r.${ReportesGeneradosColumns.GENERADO_AT} DESC`,
      organizacionIds,
    );

    return rows.map((row) => ({
      id: row.id,
      organizacionId: row.organizacion_id,
      organizacionNombre: row.org_nombre,
      tipo: row.tipo,
      fileUri: row.file_uri,
      generadoAt: row.generado_at,
      generadoPorUsuarioId: row.generado_por_usuario_id,
    }));
  }

  async registrar(input: RegistrarReporteInput): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO ${Tables.REPORTES_GENERADOS} (
        ${ReportesGeneradosColumns.ID},
        ${ReportesGeneradosColumns.ORGANIZACION_ID},
        ${ReportesGeneradosColumns.TIPO},
        ${ReportesGeneradosColumns.FILE_URI},
        ${ReportesGeneradosColumns.GENERADO_AT},
        ${ReportesGeneradosColumns.GENERADO_POR_USUARIO_ID}
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        input.id,
        input.organizacionId,
        input.tipo,
        input.fileUri,
        input.generadoAt,
        input.generadoPorUsuarioId,
      ],
    );
  }
}
