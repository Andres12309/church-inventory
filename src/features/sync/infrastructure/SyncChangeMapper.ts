import { Tables } from '@/shared/infrastructure/database/schema';

import type { SyncChange } from '../domain/entities/SyncChange';

export type SyncChangeRow = {
  id: string;
  tabla: string;
  registro_id: string;
  operacion: string;
  payload: string;
  lamport_clock: number;
  device_id: string;
  created_at: string;
};

export function parsePayload(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore
  }
  return {};
}

export function mapChangeRow(row: SyncChangeRow): SyncChange {
  return {
    id: row.id,
    tabla: row.tabla,
    registroId: row.registro_id,
    operacion: row.operacion as SyncChange['operacion'],
    payload: parsePayload(row.payload),
    lamportClock: row.lamport_clock,
    deviceId: row.device_id,
    createdAt: row.created_at,
  };
}

export function extractOrganizacionId(
  tabla: string,
  payload: Record<string, unknown>,
): string | null {
  const orgId = payload.organizacion_id ?? payload.organizacionId;
  if (typeof orgId === 'string') {
    return orgId;
  }

  if (tabla === Tables.ORGANIZACIONES) {
    const id = payload.id;
    return typeof id === 'string' ? id : null;
  }

  return null;
}

export function isChangeInOrgScope(
  tabla: string,
  payload: Record<string, unknown>,
  scopeSet: Set<string>,
): boolean {
  const orgId = extractOrganizacionId(tabla, payload);
  if (!orgId) {
    return false;
  }

  if (scopeSet.has(orgId)) {
    return true;
  }

  if (tabla === Tables.ORGANIZACIONES) {
    const parentId = payload.parent_id ?? payload.parentId;
    return typeof parentId === 'string' && scopeSet.has(parentId);
  }

  return false;
}
