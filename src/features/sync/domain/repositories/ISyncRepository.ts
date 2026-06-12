import type { OrgChecksumEntry } from '../protocol/SyncProtocolMessages';

import type { SyncChange } from '../entities/SyncChange';
import type { SyncMeta } from '../entities/SyncMeta';
import type { SyncSession } from '../entities/SyncSession';

export type MergeResult = {
  applied: number;
  conflicts: number;
  rejected: number;
};

export interface ISyncRepository {
  obtenerMeta(): Promise<SyncMeta | null>;
  guardarMeta(meta: SyncMeta): Promise<void>;
  obtenerUltimoLamport(): Promise<number>;
  listarDeltasDesde(lamportExclusive: number, orgScope: string[]): Promise<SyncChange[]>;
  calcularChecksums(orgIds: string[]): Promise<OrgChecksumEntry[]>;
  crearSesion(session: SyncSession): Promise<void>;
  finalizarSesion(
    sessionId: string,
    status: SyncSession['status'],
    stats: Pick<SyncSession, 'recordsSent' | 'recordsReceived' | 'conflictsResolved'>,
  ): Promise<void>;
  aplicarCambiosRemotos(
    changes: SyncChange[],
    orgScope: string[],
    localDeviceId: string,
  ): Promise<MergeResult>;
  registrarCambioLocal(change: SyncChange): Promise<void>;
}
