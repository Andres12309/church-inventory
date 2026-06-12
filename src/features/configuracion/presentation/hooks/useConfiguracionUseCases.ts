import type { SQLiteDatabase } from 'expo-sqlite';
import { useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { ObtenerResumenSistema } from '../../application/use-cases/ObtenerResumenSistema';
import { SqliteSistemaRepository } from '../../infrastructure/SqliteSistemaRepository';

export function createConfiguracionUseCases(db: SQLiteDatabase) {
  const sistemaRepository = new SqliteSistemaRepository(db);

  return {
    obtenerResumenSistema: new ObtenerResumenSistema(sistemaRepository),
  };
}

export function useConfiguracionUseCases() {
  const db = useSQLiteContext();
  return useMemo(() => createConfiguracionUseCases(db), [db]);
}
