import type { ReporteGenerado } from '../entities/ReporteGenerado';

export type RegistrarReporteInput = {
  readonly id: string;
  readonly organizacionId: string;
  readonly tipo: ReporteGenerado['tipo'];
  readonly fileUri: string;
  readonly generadoAt: string;
  readonly generadoPorUsuarioId: string | null;
};

export interface IReporteRepository {
  listarPorOrganizaciones(organizacionIds: string[]): Promise<ReporteGenerado[]>;
  registrar(input: RegistrarReporteInput): Promise<void>;
}
