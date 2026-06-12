import type { SQLiteDatabase } from 'expo-sqlite';

import { ensureTiposActividadSeed } from '@/features/ofrendas/infrastructure/ensureTiposActividadSeed';
import { runSerializedSqlite } from '@/shared/infrastructure/database/sqliteRetry';

import { ensureHierarchySeed } from './ensureHierarchySeed';

/** Sincroniza configuración OTA empaquetada (jerarquía + catálogos) hacia SQLite. */
export async function ensureAppSeeds(db: SQLiteDatabase): Promise<void> {
  await runSerializedSqlite(async () => {
    await ensureHierarchySeed(db);
    await ensureTiposActividadSeed(db);
  });
}
