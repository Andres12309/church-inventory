import type { ReporteTipo } from '../../domain/entities/ReporteGenerado';

export type GenerarReporteInput = {
  readonly tipo: ReporteTipo;
  readonly fechaInicio?: string;
  readonly fechaFin?: string;
};
