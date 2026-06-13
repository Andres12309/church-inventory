import type { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { v4 as uuidv4 } from 'uuid';

import {
  BienesColumns,
  OfrendasColumns,
  OrganizacionesColumns,
  SyncChangesColumns,
  SyncMetaColumns,
  SyncSessionsColumns,
  Tables,
  TiposActividadColumns,
  UsuariosColumns,
} from '@/shared/infrastructure/database/schema';
import { getNextLamportClock } from '@/shared/infrastructure/sync/SyncContext';

import { resolveSyncPlan } from '../application/SyncSegmentResolver';
import { SYNCABLE_TABLES } from '../domain/constants/SyncConstants';
import type { SyncDirection, SyncPlan } from '../domain/entities/SyncPlan';
import type { SyncChange } from '../domain/entities/SyncChange';
import type { SyncMeta } from '../domain/entities/SyncMeta';
import type { SyncSession } from '../domain/entities/SyncSession';
import type { OrgChecksumEntry } from '../domain/protocol/SyncProtocolMessages';
import type { ISyncRepository, MergeResult } from '../domain/repositories/ISyncRepository';
import { deserializePayloadFromTransfer } from './PayloadSerializer';
import { SyncChangeApplier } from './SyncChangeApplier';
import {
  isChangeInOrgScope,
  isChangeInResolvedPlan,
  mapChangeRow,
  type SyncChangeRow,
} from './SyncChangeMapper';
import { buildSnapshotChanges, dedupeChangesByRecord } from './SyncSnapshotBuilder';
import { shouldApplyRemote, type LwwComparable } from './SyncMergeRules';

type ChecksumRow = {
  registro_id: string;
  updated_at: string | null;
  deleted_at: string | null;
};

export class SqliteSyncRepository implements ISyncRepository {
  private readonly applier: SyncChangeApplier;

  constructor(private readonly db: SQLiteDatabase) {
    this.applier = new SyncChangeApplier(db);
  }

  async obtenerMeta(): Promise<SyncMeta | null> {
    const row = await this.db.getFirstAsync<{
      device_id: string;
      device_name: string;
      last_sync_at: string | null;
      schema_version: number;
    }>(
      `SELECT ${SyncMetaColumns.DEVICE_ID} AS device_id,
              ${SyncMetaColumns.DEVICE_NAME} AS device_name,
              ${SyncMetaColumns.LAST_SYNC_AT} AS last_sync_at,
              ${SyncMetaColumns.SCHEMA_VERSION} AS schema_version
       FROM ${Tables.SYNC_META} LIMIT 1`,
    );
    return row
      ? {
          deviceId: row.device_id,
          deviceName: row.device_name,
          lastSyncAt: row.last_sync_at,
          schemaVersion: row.schema_version,
        }
      : null;
  }

  async guardarMeta(meta: SyncMeta): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO ${Tables.SYNC_META} (
        ${SyncMetaColumns.DEVICE_ID}, ${SyncMetaColumns.DEVICE_NAME},
        ${SyncMetaColumns.LAST_SYNC_AT}, ${SyncMetaColumns.SCHEMA_VERSION}
      ) VALUES (?, ?, ?, ?)
      ON CONFLICT(${SyncMetaColumns.DEVICE_ID}) DO UPDATE SET
        ${SyncMetaColumns.DEVICE_NAME} = excluded.${SyncMetaColumns.DEVICE_NAME},
        ${SyncMetaColumns.LAST_SYNC_AT} = excluded.${SyncMetaColumns.LAST_SYNC_AT},
        ${SyncMetaColumns.SCHEMA_VERSION} = excluded.${SyncMetaColumns.SCHEMA_VERSION}`,
      [meta.deviceId, meta.deviceName, meta.lastSyncAt, meta.schemaVersion],
    );
  }

  async obtenerUltimoLamport(): Promise<number> {
    const row = await this.db.getFirstAsync<{ max_clock: number | null }>(
      `SELECT MAX(${SyncChangesColumns.LAMPORT_CLOCK}) AS max_clock FROM ${Tables.SYNC_CHANGES}`,
    );
    return row?.max_clock ?? 0;
  }

  async listarDeltasDesde(lamportExclusive: number, orgScope: string[]): Promise<SyncChange[]> {
    const rows = await this.db.getAllAsync<SyncChangeRow>(
      `SELECT ${SyncChangesColumns.ID} AS id, ${SyncChangesColumns.TABLA} AS tabla,
              ${SyncChangesColumns.REGISTRO_ID} AS registro_id, ${SyncChangesColumns.OPERACION} AS operacion,
              ${SyncChangesColumns.PAYLOAD} AS payload, ${SyncChangesColumns.LAMPORT_CLOCK} AS lamport_clock,
              ${SyncChangesColumns.DEVICE_ID} AS device_id, ${SyncChangesColumns.CREATED_AT} AS created_at
       FROM ${Tables.SYNC_CHANGES}
       WHERE ${SyncChangesColumns.LAMPORT_CLOCK} > ?
       ORDER BY ${SyncChangesColumns.LAMPORT_CLOCK} ASC`,
      [lamportExclusive],
    );

    const scopeSet = new Set(orgScope);
    return rows
      .map(mapChangeRow)
      .filter((change) => isChangeInOrgScope(change.tabla, change.payload, scopeSet));
  }

  async listarCambiosParaEnviar(
    lamportExclusive: number,
    orgScope: string[],
    localDeviceId: string,
    plan?: SyncPlan,
    direction?: SyncDirection,
  ): Promise<SyncChange[]> {
    const resolved = await resolveSyncPlan(this.db, plan ?? { mode: 'all' }, orgScope);
    const selective = plan?.mode === 'segments' || direction === 'push';

    if (selective) {
      return dedupeChangesByRecord(
        await buildSnapshotChanges(this.db, resolved, localDeviceId),
      );
    }

    const deltas = await this.listarDeltasDesde(lamportExclusive, orgScope);
    const filtered = deltas.filter((change) =>
      isChangeInResolvedPlan(change, change.payload, resolved),
    );

    if (resolved.tables.has(Tables.USUARIOS)) {
      const usuarioSnapshot = await buildSnapshotChanges(this.db, resolved, localDeviceId);
      const usuarioOnly = usuarioSnapshot.filter((c) => c.tabla === Tables.USUARIOS);
      return dedupeChangesByRecord([...filtered, ...usuarioOnly]);
    }

    return filtered;
  }

  async calcularChecksums(orgIds: string[]): Promise<OrgChecksumEntry[]> {
    const entries: OrgChecksumEntry[] = [];

    for (const orgId of orgIds) {
      const parts: string[] = [];

      const bienes = await this.db.getAllAsync<ChecksumRow>(
        `SELECT ${BienesColumns.ID} AS registro_id,
                ${BienesColumns.UPDATED_AT} AS updated_at,
                ${BienesColumns.DELETED_AT} AS deleted_at
         FROM ${Tables.BIENES}
         WHERE ${BienesColumns.ORGANIZACION_ID} = ?
         ORDER BY ${BienesColumns.ID} ASC`,
        [orgId],
      );

      for (const row of bienes) {
        parts.push(`b:${row.registro_id}:${row.updated_at ?? ''}:${row.deleted_at ?? ''}`);
      }

      const ofrendas = await this.db.getAllAsync<ChecksumRow>(
        `SELECT ${OfrendasColumns.ID} AS registro_id,
                ${OfrendasColumns.UPDATED_AT} AS updated_at,
                ${OfrendasColumns.DELETED_AT} AS deleted_at
         FROM ${Tables.OFRENDAS}
         WHERE ${OfrendasColumns.ORGANIZACION_ID} = ?
         ORDER BY ${OfrendasColumns.ID} ASC`,
        [orgId],
      );

      for (const row of ofrendas) {
        parts.push(`o:${row.registro_id}:${row.updated_at ?? ''}:${row.deleted_at ?? ''}`);
      }

      const org = await this.db.getFirstAsync<ChecksumRow>(
        `SELECT ${OrganizacionesColumns.ID} AS registro_id,
                ${OrganizacionesColumns.UPDATED_AT} AS updated_at,
                ${OrganizacionesColumns.DELETED_AT} AS deleted_at
         FROM ${Tables.ORGANIZACIONES}
         WHERE ${OrganizacionesColumns.ID} = ?`,
        [orgId],
      );

      if (org) {
        parts.push(`g:${org.registro_id}:${org.updated_at ?? ''}:${org.deleted_at ?? ''}`);
      }

      const checksum = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        parts.join('|') || orgId,
      );
      entries.push({ organizacionId: orgId, checksum });
    }

    return entries;
  }

  async crearSesion(session: SyncSession): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO ${Tables.SYNC_SESSIONS} (
        ${SyncSessionsColumns.ID}, ${SyncSessionsColumns.PEER_DEVICE_ID}, ${SyncSessionsColumns.PEER_DEVICE_NAME},
        ${SyncSessionsColumns.STARTED_AT}, ${SyncSessionsColumns.FINISHED_AT}, ${SyncSessionsColumns.STATUS},
        ${SyncSessionsColumns.RECORDS_SENT}, ${SyncSessionsColumns.RECORDS_RECEIVED}, ${SyncSessionsColumns.CONFLICTS_RESOLVED}
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.id,
        session.peerDeviceId,
        session.peerDeviceName,
        session.startedAt,
        session.finishedAt,
        session.status,
        session.recordsSent,
        session.recordsReceived,
        session.conflictsResolved,
      ],
    );
  }

  async finalizarSesion(
    sessionId: string,
    status: SyncSession['status'],
    stats: Pick<SyncSession, 'recordsSent' | 'recordsReceived' | 'conflictsResolved'>,
  ): Promise<void> {
    await this.db.runAsync(
      `UPDATE ${Tables.SYNC_SESSIONS}
       SET ${SyncSessionsColumns.STATUS} = ?, ${SyncSessionsColumns.FINISHED_AT} = ?,
           ${SyncSessionsColumns.RECORDS_SENT} = ?, ${SyncSessionsColumns.RECORDS_RECEIVED} = ?,
           ${SyncSessionsColumns.CONFLICTS_RESOLVED} = ?
       WHERE ${SyncSessionsColumns.ID} = ?`,
      [
        status,
        new Date().toISOString(),
        stats.recordsSent,
        stats.recordsReceived,
        stats.conflictsResolved,
        sessionId,
      ],
    );
  }

  async registrarCambioLocal(change: SyncChange): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO ${Tables.SYNC_CHANGES} (
        ${SyncChangesColumns.ID}, ${SyncChangesColumns.TABLA}, ${SyncChangesColumns.REGISTRO_ID},
        ${SyncChangesColumns.OPERACION}, ${SyncChangesColumns.PAYLOAD}, ${SyncChangesColumns.LAMPORT_CLOCK},
        ${SyncChangesColumns.DEVICE_ID}, ${SyncChangesColumns.CREATED_AT}
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        change.id,
        change.tabla,
        change.registroId,
        change.operacion,
        JSON.stringify(change.payload),
        change.lamportClock,
        change.deviceId,
        change.createdAt,
      ],
    );
  }

  async aplicarCambiosRemotos(
    changes: SyncChange[],
    orgScope: string[],
    localDeviceId: string,
    plan?: SyncPlan,
  ): Promise<MergeResult> {
    const resolved = await resolveSyncPlan(this.db, plan ?? { mode: 'all' }, orgScope);
    const scopeSet = new Set(resolved.dataOrgScope.length > 0 ? resolved.dataOrgScope : orgScope);
    let applied = 0;
    let conflicts = 0;
    let rejected = 0;

    await this.db.withTransactionAsync(async () => {
      for (const change of changes) {
        if (!SYNCABLE_TABLES.includes(change.tabla as (typeof SYNCABLE_TABLES)[number])) {
          rejected += 1;
          continue;
        }

        const payload = deserializePayloadFromTransfer(change.payload);
        if (!isChangeInResolvedPlan(change, payload, resolved)) {
          rejected += 1;
          continue;
        }

        if (
          change.tabla !== Tables.TIPOS_ACTIVIDAD &&
          change.tabla !== Tables.USUARIOS &&
          change.tabla !== Tables.ORGANIZACIONES &&
          !isChangeInOrgScope(change.tabla, payload, scopeSet)
        ) {
          rejected += 1;
          continue;
        }

        const remote = this.toComparable(change, payload);
        const local = await this.readLocalComparable(change.tabla, change.registroId);

        if (local && !shouldApplyRemote(local, remote)) {
          conflicts += 1;
          continue;
        }

        await this.applier.apply(change.tabla, change.registroId, payload, change.operacion);

        const freshPayload =
          (await fetchRowPayload(this.db, change.tabla, change.registroId)) ?? payload;
        const lamportClock = await getNextLamportClock(this.db);

        await this.registrarCambioLocal(
          createSyncChangeRecord(
            change.tabla,
            change.registroId,
            change.operacion,
            freshPayload,
            lamportClock,
            localDeviceId,
          ),
        );

        applied += 1;
      }
    });

    return { applied, conflicts, rejected };
  }

  private toComparable(change: SyncChange, payload: Record<string, unknown>): LwwComparable {
    return {
      lamportClock: change.lamportClock,
      updatedAt: String(payload.updated_at ?? change.createdAt),
      deviceId: change.deviceId,
      deletedAt: (payload.deleted_at as string | null | undefined) ?? null,
    };
  }

  private async readLocalComparable(tabla: string, registroId: string): Promise<LwwComparable | null> {
    const tableMap: Record<string, string> = {
      [Tables.BIENES]: Tables.BIENES,
      [Tables.OFRENDAS]: Tables.OFRENDAS,
      [Tables.ORGANIZACIONES]: Tables.ORGANIZACIONES,
      [Tables.TIPOS_ACTIVIDAD]: Tables.TIPOS_ACTIVIDAD,
      [Tables.USUARIOS]: Tables.USUARIOS,
    };

    const table = tableMap[tabla];
    if (!table) {
      return null;
    }

    const cols =
      tabla === Tables.BIENES
        ? BienesColumns
        : tabla === Tables.OFRENDAS
          ? OfrendasColumns
          : tabla === Tables.TIPOS_ACTIVIDAD
            ? TiposActividadColumns
            : OrganizacionesColumns;

    if (tabla === Tables.USUARIOS) {
      const row = await this.db.getFirstAsync<{ updated_at: string }>(
        `SELECT ${UsuariosColumns.UPDATED_AT} AS updated_at
         FROM ${Tables.USUARIOS} WHERE ${UsuariosColumns.ID} = ?`,
        [registroId],
      );
      if (!row) {
        return null;
      }
      return {
        lamportClock: 0,
        updatedAt: row.updated_at,
        deviceId: '',
        deletedAt: null,
      };
    }

    const row =
      tabla === Tables.TIPOS_ACTIVIDAD
        ? await this.db.getFirstAsync<{
            updated_at: string;
            updated_by_device: string;
            sync_vector: string;
          }>(
            `SELECT ${cols.UPDATED_AT} AS updated_at, ${cols.UPDATED_BY_DEVICE} AS updated_by_device,
                    ${cols.SYNC_VECTOR} AS sync_vector
             FROM ${table} WHERE ${cols.ID} = ?`,
            [registroId],
          )
        : await this.db.getFirstAsync<{
            updated_at: string;
            updated_by_device: string;
            deleted_at?: string | null;
            sync_vector: string;
          }>(
            `SELECT ${cols.UPDATED_AT} AS updated_at, ${cols.UPDATED_BY_DEVICE} AS updated_by_device,
                    ${(cols as typeof BienesColumns).DELETED_AT} AS deleted_at, ${cols.SYNC_VECTOR} AS sync_vector
             FROM ${table} WHERE ${cols.ID} = ?`,
            [registroId],
          );

    if (!row) {
      return null;
    }

    let lamport = 0;
    try {
      const vector = JSON.parse(row.sync_vector) as Record<string, number>;
      lamport = Math.max(0, ...Object.values(vector));
    } catch {
      lamport = 0;
    }

    const deletedAt =
      tabla === Tables.TIPOS_ACTIVIDAD
        ? null
        : ((row as { deleted_at?: string | null }).deleted_at ?? null);

    return {
      lamportClock: lamport,
      updatedAt: row.updated_at,
      deviceId: row.updated_by_device,
      deletedAt,
    };
  }
}

export function createSyncChangeRecord(
  tabla: string,
  registroId: string,
  operacion: SyncChange['operacion'],
  payload: Record<string, unknown>,
  lamportClock: number,
  deviceId: string,
): SyncChange {
  return {
    id: uuidv4(),
    tabla,
    registroId,
    operacion,
    payload,
    lamportClock,
    deviceId,
    createdAt: new Date().toISOString(),
  };
}

export async function fetchRowPayload(
  db: SQLiteDatabase,
  tabla: string,
  registroId: string,
): Promise<Record<string, unknown> | null> {
  if (tabla === Tables.BIENES) {
    return db.getFirstAsync<Record<string, unknown>>(
      `SELECT * FROM ${Tables.BIENES} WHERE ${BienesColumns.ID} = ?`,
      [registroId],
    );
  }

  if (tabla === Tables.OFRENDAS) {
    return db.getFirstAsync<Record<string, unknown>>(
      `SELECT * FROM ${Tables.OFRENDAS} WHERE ${OfrendasColumns.ID} = ?`,
      [registroId],
    );
  }

  if (tabla === Tables.ORGANIZACIONES) {
    return db.getFirstAsync<Record<string, unknown>>(
      `SELECT * FROM ${Tables.ORGANIZACIONES} WHERE ${OrganizacionesColumns.ID} = ?`,
      [registroId],
    );
  }

  if (tabla === Tables.TIPOS_ACTIVIDAD) {
    return db.getFirstAsync<Record<string, unknown>>(
      `SELECT * FROM ${Tables.TIPOS_ACTIVIDAD} WHERE ${TiposActividadColumns.ID} = ?`,
      [registroId],
    );
  }

  if (tabla === Tables.USUARIOS) {
    return db.getFirstAsync<Record<string, unknown>>(
      `SELECT * FROM ${Tables.USUARIOS} WHERE ${UsuariosColumns.ID} = ?`,
      [registroId],
    );
  }

  return null;
}
