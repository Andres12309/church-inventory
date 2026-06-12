import type { InventarioAggregate } from '../entities/InventarioAggregate';

export interface IInventarioAggregateRepository {
  obtenerPorOrganizacionId(organizacionId: string): Promise<InventarioAggregate | null>;
  listarPorOrganizacionIds(organizacionIds: string[]): Promise<InventarioAggregate[]>;
}
