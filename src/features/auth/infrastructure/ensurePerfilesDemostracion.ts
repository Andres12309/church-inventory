import type { SQLiteDatabase } from 'expo-sqlite';

import { ensureHierarchySeed } from './ensureHierarchySeed';

/** @deprecated Usar ensureHierarchySeed — mantiene compatibilidad con llamadas existentes. */
export async function ensurePerfilesDemostracion(db: SQLiteDatabase): Promise<void> {
  await ensureHierarchySeed(db);
}
