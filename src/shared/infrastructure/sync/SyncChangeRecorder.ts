import type { SQLiteDatabase } from 'expo-sqlite';

import {
  createSyncChangeRecord,
  fetchRowPayload,
  type SqliteSyncRepository,
} from '@/features/sync/infrastructure/SqliteSyncRepository';
import { SyncOperacion, Tables } from '@/shared/infrastructure/database/schema';
import { getNextLamportClock, getOrCreateDeviceId } from '@/shared/infrastructure/sync/SyncContext';

export async function registrarCambioSyncDesdeTabla(
  db: SQLiteDatabase,
  syncRepository: SqliteSyncRepository,
  tabla: string,
  registroId: string,
  operacion: typeof SyncOperacion.INSERT | typeof SyncOperacion.UPDATE | typeof SyncOperacion.DELETE,
  payloadOverride?: Record<string, unknown>,
): Promise<void> {
  const deviceId = await getOrCreateDeviceId(db);
  const lamportClock = await getNextLamportClock(db);
  const payload = payloadOverride ?? (await fetchRowPayload(db, tabla, registroId));

  if (!payload) {
    return;
  }

  await syncRepository.registrarCambioLocal(
    createSyncChangeRecord(tabla, registroId, operacion, payload, lamportClock, deviceId),
  );
}

export async function registrarBienSync(
  db: SQLiteDatabase,
  syncRepository: SqliteSyncRepository,
  registroId: string,
  operacion: typeof SyncOperacion.INSERT | typeof SyncOperacion.UPDATE | typeof SyncOperacion.DELETE,
): Promise<void> {
  await registrarCambioSyncDesdeTabla(db, syncRepository, Tables.BIENES, registroId, operacion);
}

export async function registrarOfrendaSync(
  db: SQLiteDatabase,
  syncRepository: SqliteSyncRepository,
  registroId: string,
  operacion: typeof SyncOperacion.INSERT | typeof SyncOperacion.UPDATE | typeof SyncOperacion.DELETE,
): Promise<void> {
  await registrarCambioSyncDesdeTabla(db, syncRepository, Tables.OFRENDAS, registroId, operacion);
}

export async function registrarOrganizacionSync(
  db: SQLiteDatabase,
  syncRepository: SqliteSyncRepository,
  registroId: string,
  operacion: typeof SyncOperacion.INSERT | typeof SyncOperacion.UPDATE | typeof SyncOperacion.DELETE,
): Promise<void> {
  await registrarCambioSyncDesdeTabla(
    db,
    syncRepository,
    Tables.ORGANIZACIONES,
    registroId,
    operacion,
  );
}

export async function registrarTipoActividadSync(
  db: SQLiteDatabase,
  syncRepository: SqliteSyncRepository,
  registroId: string,
  operacion: typeof SyncOperacion.INSERT | typeof SyncOperacion.UPDATE | typeof SyncOperacion.DELETE,
): Promise<void> {
  await registrarCambioSyncDesdeTabla(
    db,
    syncRepository,
    Tables.TIPOS_ACTIVIDAD,
    registroId,
    operacion,
  );
}
