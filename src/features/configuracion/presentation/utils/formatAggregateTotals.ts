import { formatearMonto } from '@/features/ofrendas/presentation/store/ofrendasStore';

import type { InventarioAggregate } from '../../domain/entities/InventarioAggregate';

export function formatearTotalesAggregate(aggregate: InventarioAggregate | null | undefined): {
  bienesLabel: string;
  ofrendasLabel: string;
} {
  const totalBienes = aggregate?.totalBienes ?? 0;
  const totalOfrendas = aggregate?.totalOfrendas ?? 0;

  return {
    bienesLabel: totalBienes > 0 ? `${totalBienes} bien(es)` : '0 bienes',
    ofrendasLabel: totalOfrendas > 0 ? formatearMonto(totalOfrendas) : formatearMonto(0),
  };
}

export function aggregateMapFromList(
  aggregates: InventarioAggregate[],
): Record<string, InventarioAggregate> {
  return Object.fromEntries(aggregates.map((item) => [item.organizacionId, item]));
}
