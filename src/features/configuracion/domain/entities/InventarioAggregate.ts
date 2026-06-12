import type { BienEstadoValue } from '@/shared/infrastructure/database/schema';

export type TotalesBienesPorEstado = Partial<Record<BienEstadoValue, number>>;

export type TotalesOfrendasPorTipo = Record<string, number>;

export type InventarioAggregate = {
  readonly organizacionId: string;
  readonly totalBienes: number;
  readonly totalBienesPorEstado: TotalesBienesPorEstado;
  readonly totalOfrendas: number;
  readonly totalOfrendasPorTipo: TotalesOfrendasPorTipo;
  readonly calculadoAt: string;
};

export const AGGREGATE_VACIO: Omit<InventarioAggregate, 'organizacionId' | 'calculadoAt'> = {
  totalBienes: 0,
  totalBienesPorEstado: {},
  totalOfrendas: 0,
  totalOfrendasPorTipo: {},
};
