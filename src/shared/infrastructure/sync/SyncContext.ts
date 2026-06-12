import type { SQLiteDatabase } from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';

import { SyncChangesColumns, SyncMetaColumns, Tables } from '@/shared/infrastructure/database/schema';

const DEVICE_ID_KEY = 'fieles_bienes_device_id';

export async function getOrCreateDeviceId(db: SQLiteDatabase): Promise<string> {
  const metaRow = await db.getFirstAsync<{ device_id: string }>(
    `SELECT ${SyncMetaColumns.DEVICE_ID} AS device_id FROM ${Tables.SYNC_META} LIMIT 1`,
  );

  if (metaRow?.device_id) {
    return metaRow.device_id;
  }

  if (Platform.OS === 'web') {
    const stored = globalThis.localStorage?.getItem(DEVICE_ID_KEY);
    if (stored) {
      return stored;
    }
    const generated = uuidv4();
    globalThis.localStorage?.setItem(DEVICE_ID_KEY, generated);
    return generated;
  }

  const secureStored = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (secureStored) {
    return secureStored;
  }

  const generated = uuidv4();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, generated);
  return generated;
}

export async function getNextLamportClock(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ max_clock: number | null }>(
    `SELECT MAX(${SyncChangesColumns.LAMPORT_CLOCK}) AS max_clock FROM ${Tables.SYNC_CHANGES}`,
  );

  return (row?.max_clock ?? 0) + 1;
}
