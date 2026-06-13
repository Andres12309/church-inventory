import type { SQLiteDatabase } from 'expo-sqlite';
import { v4 as uuidv4 } from 'uuid';

import type { SyncChange } from '@/features/sync/domain/entities/SyncChange';
import {
  BienesColumns,
  OfrendasColumns,
  OrganizacionesColumns,
  SyncOperacion,
  Tables,
  TiposActividadColumns,
  UsuariosColumns,
} from '@/shared/infrastructure/database/schema';
import { getNextLamportClock } from '@/shared/infrastructure/sync/SyncContext';

import type { ResolvedSyncPlan } from '../application/SyncSegmentResolver';

function placeholders(count: number): string {
  return Array(count).fill('?').join(', ');
}

export async function buildSnapshotChanges(
  db: SQLiteDatabase,
  resolved: ResolvedSyncPlan,
  deviceId: string,
): Promise<SyncChange[]> {
  const changes: SyncChange[] = [];
  const now = new Date().toISOString();

  if (resolved.tables.has(Tables.ORGANIZACIONES) && resolved.orgScope.length > 0) {
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM ${Tables.ORGANIZACIONES}
       WHERE ${OrganizacionesColumns.ID} IN (${placeholders(resolved.orgScope.length)})
         AND ${OrganizacionesColumns.DELETED_AT} IS NULL`,
      resolved.orgScope,
    );
    for (const row of rows) {
      changes.push(await toSnapshotChange(db, Tables.ORGANIZACIONES, row, deviceId, now));
    }
  }

  if (resolved.tables.has(Tables.USUARIOS) && resolved.dataOrgScope.length > 0) {
    const userFilter = resolved.userIds;
    const rows = userFilter
      ? await db.getAllAsync<Record<string, unknown>>(
          `SELECT * FROM ${Tables.USUARIOS}
           WHERE ${UsuariosColumns.ID} IN (${placeholders(userFilter.length)})
             AND ${UsuariosColumns.ACTIVO} = 1`,
          userFilter,
        )
      : await db.getAllAsync<Record<string, unknown>>(
          `SELECT * FROM ${Tables.USUARIOS}
           WHERE ${UsuariosColumns.ORGANIZACION_ID} IN (${placeholders(resolved.dataOrgScope.length)})
             AND ${UsuariosColumns.ACTIVO} = 1`,
          resolved.dataOrgScope,
        );
    for (const row of rows) {
      changes.push(await toSnapshotChange(db, Tables.USUARIOS, row, deviceId, now));
    }
  }

  if (resolved.tables.has(Tables.TIPOS_ACTIVIDAD)) {
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM ${Tables.TIPOS_ACTIVIDAD}
       WHERE ${TiposActividadColumns.ACTIVO} = 1`,
    );
    for (const row of rows) {
      changes.push(await toSnapshotChange(db, Tables.TIPOS_ACTIVIDAD, row, deviceId, now));
    }
  }

  if (resolved.tables.has(Tables.OFRENDAS) && resolved.dataOrgScope.length > 0) {
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM ${Tables.OFRENDAS}
       WHERE ${OfrendasColumns.ORGANIZACION_ID} IN (${placeholders(resolved.dataOrgScope.length)})
         AND ${OfrendasColumns.DELETED_AT} IS NULL`,
      resolved.dataOrgScope,
    );
    for (const row of rows) {
      changes.push(await toSnapshotChange(db, Tables.OFRENDAS, row, deviceId, now));
    }
  }

  if (resolved.tables.has(Tables.BIENES) && resolved.dataOrgScope.length > 0) {
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM ${Tables.BIENES}
       WHERE ${BienesColumns.ORGANIZACION_ID} IN (${placeholders(resolved.dataOrgScope.length)})
         AND ${BienesColumns.DELETED_AT} IS NULL`,
      resolved.dataOrgScope,
    );
    for (const row of rows) {
      changes.push(await toSnapshotChange(db, Tables.BIENES, row, deviceId, now));
    }
  }

  return changes;
}

async function toSnapshotChange(
  db: SQLiteDatabase,
  tabla: string,
  payload: Record<string, unknown>,
  deviceId: string,
  createdAt: string,
): Promise<SyncChange> {
  const registroId = String(payload.id);
  const lamportClock = await getNextLamportClock(db);

  return {
    id: uuidv4(),
    tabla,
    registroId,
    operacion: SyncOperacion.INSERT,
    payload,
    lamportClock,
    deviceId,
    createdAt,
  };
}

export function dedupeChangesByRecord(changes: SyncChange[]): SyncChange[] {
  const byKey = new Map<string, SyncChange>();

  for (const change of changes) {
    const key = `${change.tabla}:${change.registroId}`;
    const existing = byKey.get(key);
    if (!existing || change.lamportClock >= existing.lamportClock) {
      byKey.set(key, change);
    }
  }

  return [...byKey.values()].sort((a, b) => a.lamportClock - b.lamportClock);
}
