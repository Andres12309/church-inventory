import type { SQLiteDatabase } from 'expo-sqlite';

import { ensureAppSeeds } from './ensureAppSeeds';

export async function ensurePerfilesDemostracion(db: SQLiteDatabase): Promise<void> {
  await ensureAppSeeds(db);
}
