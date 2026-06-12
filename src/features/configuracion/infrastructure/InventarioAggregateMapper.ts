import type { BienEstadoValue } from '@/shared/infrastructure/database/schema';

import type {
  InventarioAggregate,
  TotalesBienesPorEstado,
  TotalesOfrendasPorTipo,
} from '../domain/entities/InventarioAggregate';

type AggregateRow = {
  organizacion_id: string;
  total_bienes: number;
  total_bienes_por_estado: string;
  total_ofrendas: number;
  total_ofrendas_por_tipo: string;
  calculado_at: string;
};

export function parseJsonRecord(value: string): Record<string, number> {
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).map(([key, raw]) => [key, Number(raw) || 0]),
    );
  } catch {
    return {};
  }
}

export function parseBienesPorEstado(json: string): TotalesBienesPorEstado {
  const record = parseJsonRecord(json);
  const result: TotalesBienesPorEstado = {};

  for (const [estado, total] of Object.entries(record)) {
    result[estado as BienEstadoValue] = total;
  }

  return result;
}

export function parseOfrendasPorTipo(json: string): TotalesOfrendasPorTipo {
  return parseJsonRecord(json);
}

export function mapAggregateRow(row: AggregateRow): InventarioAggregate {
  return {
    organizacionId: row.organizacion_id,
    totalBienes: row.total_bienes,
    totalBienesPorEstado: parseBienesPorEstado(row.total_bienes_por_estado),
    totalOfrendas: Math.round(row.total_ofrendas * 100) / 100,
    totalOfrendasPorTipo: parseOfrendasPorTipo(row.total_ofrendas_por_tipo),
    calculadoAt: row.calculado_at,
  };
}

export function mergeJsonRecords(
  target: Record<string, number>,
  source: Record<string, number>,
): Record<string, number> {
  const merged = { ...target };

  for (const [key, value] of Object.entries(source)) {
    merged[key] = (merged[key] ?? 0) + value;
  }

  return merged;
}

export function serializarJsonRecord(record: Record<string, number>): string {
  const normalized = Object.fromEntries(
    Object.entries(record)
      .filter(([, value]) => value !== 0)
      .map(([key, value]) => [key, value]),
  );
  return JSON.stringify(normalized);
}

export type { AggregateRow };
