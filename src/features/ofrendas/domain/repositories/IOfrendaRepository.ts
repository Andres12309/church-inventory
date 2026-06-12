import type { Ofrenda } from '../entities/Ofrenda';
import type { TipoActividad } from '../entities/TipoActividad';

import type { FinanzaNaturalezaValue } from '../entities/FinanzaNaturaleza';

export type OfrendaFiltros = {
  tipoActividadId?: string;
  naturaleza?: FinanzaNaturalezaValue;
  fechaInicio?: string;
  fechaFin?: string;
};

export interface IOfrendaRepository {
  obtenerPorId(id: string): Promise<Ofrenda | null>;
  listarPorOrganizacion(orgId: string, filtros?: OfrendaFiltros): Promise<Ofrenda[]>;
  listarTiposActividad(): Promise<TipoActividad[]>;
  obtenerTipoActividadPorId(id: string): Promise<TipoActividad | null>;
  obtenerTipoActividadPorCodigo(codigo: string): Promise<TipoActividad | null>;
  guardarTipoActividad(tipo: TipoActividad): Promise<void>;
  guardar(ofrenda: Ofrenda): Promise<void>;
  eliminarLogico(id: string, deviceId: string, lamportClock: number): Promise<void>;
}
