import type { BienEstadoValue } from '@/shared/infrastructure/database/schema';

import type { Bien } from '../entities/Bien';
import type { CategoriaBien } from '../entities/CategoriaBien';

export type BienFiltros = {
  categoriaId?: string;
  estado?: BienEstadoValue;
  busqueda?: string;
};

export interface IBienRepository {
  obtenerPorId(id: string): Promise<Bien | null>;
  listarPorOrganizacion(orgId: string, filtros?: BienFiltros): Promise<Bien[]>;
  listarCategorias(): Promise<CategoriaBien[]>;
  guardar(bien: Bien): Promise<void>;
  eliminarLogico(id: string, deviceId: string, lamportClock: number): Promise<void>;
}
