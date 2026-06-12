import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import { type ReactNode, useCallback } from 'react';

import { DATABASE_NAME } from './schema';
import { DatabaseMigrationError, runMigrations } from './runMigrations';

type DatabaseProviderProps = {
  children: ReactNode;
  onMigrationError?: (error: DatabaseMigrationError) => void;
};

export function DatabaseProvider({ children, onMigrationError }: DatabaseProviderProps) {
  const handleInit = useCallback(
    async (db: SQLiteDatabase) => {
      try {
        await runMigrations(db);
      } catch (error) {
        if (error instanceof DatabaseMigrationError) {
          onMigrationError?.(error);
          throw error;
        }

        const wrapped = new DatabaseMigrationError(0, error);
        onMigrationError?.(wrapped);
        throw wrapped;
      }
    },
    [onMigrationError],
  );

  const handleError = useCallback((error: Error) => {
    console.error('[DatabaseProvider] Error de SQLite:', error);
  }, []);

  return (
    <SQLiteProvider
      databaseName={DATABASE_NAME}
      onInit={handleInit}
      onError={handleError}
      options={{ enableChangeListener: true }}
    >
      {children}
    </SQLiteProvider>
  );
}

export { useSQLiteContext } from 'expo-sqlite';
export { DatabaseMigrationError, getAppliedMigrationVersions, runMigrations } from './runMigrations';
