export type ReporteTipo = 'bienes' | 'ofrendas' | 'consolidado';

export type ReporteGenerado = {
  readonly id: string;
  readonly organizacionId: string;
  readonly organizacionNombre: string;
  readonly tipo: ReporteTipo;
  readonly fileUri: string;
  readonly generadoAt: string;
  readonly generadoPorUsuarioId: string | null;
};
