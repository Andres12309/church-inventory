import type { ResumenSistema } from '../entities/ResumenSistema';

export interface ISistemaRepository {
  obtenerResumen(): Promise<ResumenSistema>;
}
