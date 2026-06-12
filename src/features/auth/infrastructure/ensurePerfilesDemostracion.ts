import type { SQLiteDatabase } from 'expo-sqlite';

import { ensureAppSeeds } from './ensureAppSeeds';

/** @deprecated Usar ensureAppSeeds — mantiene compatibilidad con llamadas existentes. */
export async function ensurePerfilesDemostracion(db: SQLiteDatabase): Promise<void> {
  await ensureAppSeeds(db);
}
