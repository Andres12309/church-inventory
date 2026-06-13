import { Tables } from '@/shared/infrastructure/database/schema';

export const SyncSegmentId = {
  USUARIOS: 'usuarios',
  ORGANIZACIONES: 'organizaciones',
  CATALOGOS: 'catalogos',
  FINANZAS: 'finanzas',
  INVENTARIO: 'inventario',
} as const;

export type SyncSegmentIdValue = (typeof SyncSegmentId)[keyof typeof SyncSegmentId];

export const ALL_SYNC_SEGMENTS: SyncSegmentIdValue[] = [
  SyncSegmentId.USUARIOS,
  SyncSegmentId.ORGANIZACIONES,
  SyncSegmentId.CATALOGOS,
  SyncSegmentId.FINANZAS,
  SyncSegmentId.INVENTARIO,
];

export type SyncPlanMode = 'all' | 'segments';

export type SyncDirection = 'bidirectional' | 'push' | 'receive';

export type SyncPlan = {
  mode: SyncPlanMode;
  segments?: SyncSegmentIdValue[];
  orgIds?: string[];
  userIds?: string[];
};

export type SyncPlanWire = SyncPlan;

export const SYNC_SEGMENT_LABELS: Record<SyncSegmentIdValue, string> = {
  [SyncSegmentId.USUARIOS]: 'Usuarios y accesos',
  [SyncSegmentId.ORGANIZACIONES]: 'Organizaciones',
  [SyncSegmentId.CATALOGOS]: 'Catálogos (tipos de actividad)',
  [SyncSegmentId.FINANZAS]: 'Finanzas (ingresos/gastos)',
  [SyncSegmentId.INVENTARIO]: 'Inventario (bienes)',
};

export const SYNC_SEGMENT_DEPENDENCIES: Record<SyncSegmentIdValue, SyncSegmentIdValue[]> = {
  [SyncSegmentId.USUARIOS]: [SyncSegmentId.ORGANIZACIONES],
  [SyncSegmentId.ORGANIZACIONES]: [],
  [SyncSegmentId.CATALOGOS]: [],
  [SyncSegmentId.FINANZAS]: [SyncSegmentId.ORGANIZACIONES, SyncSegmentId.CATALOGOS],
  [SyncSegmentId.INVENTARIO]: [SyncSegmentId.ORGANIZACIONES],
};

export const CHAPEL_HANDOVER_SEGMENTS: SyncSegmentIdValue[] = [
  SyncSegmentId.ORGANIZACIONES,
  SyncSegmentId.USUARIOS,
  SyncSegmentId.CATALOGOS,
  SyncSegmentId.FINANZAS,
  SyncSegmentId.INVENTARIO,
];

export function segmentToTables(segment: SyncSegmentIdValue): string[] {
  switch (segment) {
    case SyncSegmentId.USUARIOS:
      return [Tables.USUARIOS];
    case SyncSegmentId.ORGANIZACIONES:
      return [Tables.ORGANIZACIONES];
    case SyncSegmentId.CATALOGOS:
      return [Tables.TIPOS_ACTIVIDAD];
    case SyncSegmentId.FINANZAS:
      return [Tables.OFRENDAS];
    case SyncSegmentId.INVENTARIO:
      return [Tables.BIENES];
    default:
      return [];
  }
}

export function defaultSyncPlan(): SyncPlan {
  return { mode: 'all' };
}
