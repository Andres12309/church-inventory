import type { SQLiteDatabase } from 'expo-sqlite';

import {
  MIGRATION_001_SQL,
  MIGRATION_001_VERSION,
} from './migrations/001_initial';
import {
  MIGRATION_002_SQL,
  MIGRATION_002_VERSION,
} from './migrations/002_usuario_username';
import {
  MIGRATION_003_SQL,
  MIGRATION_003_VERSION,
} from './migrations/003_tipos_actividad_sync';
import { SchemaMigrationsColumns, Tables } from './schema';

const MIGRATIONS = [
  { version: MIGRATION_001_VERSION, sql: MIGRATION_001_SQL },
  { version: MIGRATION_002_VERSION, sql: MIGRATION_002_SQL },
  { version: MIGRATION_003_VERSION, sql: MIGRATION_003_SQL },
] as const;

export class DatabaseMigrationError extends Error {
  readonly version: number;
  readonly cause: unknown;

  constructor(version: number, cause: unknown) {
    const message =
      cause instanceof Error
        ? `Error al aplicar migración v${version}: ${cause.message}`
        : `Error al aplicar migración v${version}`;
    super(message);
    this.name = 'DatabaseMigrationError';
    this.version = version;
    this.cause = cause;
  }
}

async function tableExists(db: SQLiteDatabase, tableName: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
    [tableName],
  );
  return row != null;
}

async function isMigrationApplied(db: SQLiteDatabase, version: number): Promise<boolean> {
  if (!(await tableExists(db, Tables.SCHEMA_MIGRATIONS))) {
    return false;
  }

  const row = await db.getFirstAsync<{ version: number }>(
    `SELECT ${SchemaMigrationsColumns.VERSION} AS version
     FROM ${Tables.SCHEMA_MIGRATIONS}
     WHERE ${SchemaMigrationsColumns.VERSION} = ?`,
    [version],
  );

  return row != null;
}

async function configurePragmas(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
}

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await configurePragmas(db);

  for (const migration of MIGRATIONS) {
    if (await isMigrationApplied(db, migration.version)) {
      continue;
    }

    try {
      await db.withExclusiveTransactionAsync(async (txn) => {
        await txn.execAsync(migration.sql);
      });
    } catch (error) {
      throw new DatabaseMigrationError(migration.version, error);
    }
  }
}

export async function getAppliedMigrationVersions(db: SQLiteDatabase): Promise<number[]> {
  if (!(await tableExists(db, Tables.SCHEMA_MIGRATIONS))) {
    return [];
  }

  const rows = await db.getAllAsync<{ version: number }>(
    `SELECT ${SchemaMigrationsColumns.VERSION} AS version
     FROM ${Tables.SCHEMA_MIGRATIONS}
     ORDER BY ${SchemaMigrationsColumns.VERSION} ASC`,
  );

  return rows.map((row) => row.version);
}
