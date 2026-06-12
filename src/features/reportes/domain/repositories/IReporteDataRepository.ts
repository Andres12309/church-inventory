import type { ReporteExportData } from '../entities/ReporteExportData';

export type ReporteDataFiltros = {
  readonly fechaInicio?: string;
  readonly fechaFin?: string;
};

export interface IReporteDataRepository {
  cargarDatos(organizacionIds: string[], filtros?: ReporteDataFiltros): Promise<ReporteExportData>;
}
