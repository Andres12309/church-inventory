import type { SQLiteDatabase } from 'expo-sqlite';
import { useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { SqliteOrganizacionRepository } from '@/features/organizaciones/infrastructure/SqliteOrganizacionRepository';

import { SqliteSyncRepository } from '@/features/sync/infrastructure/SqliteSyncRepository';

import { createConsolidationTrigger } from '@/shared/infrastructure/background/createConsolidationTrigger';

import { ConsultarInventario } from '../../application/use-cases/ConsultarInventario';
import { GestionarBien } from '../../application/use-cases/GestionarBien';
import { SqliteBienRepository } from '../../infrastructure/SqliteBienRepository';

export function createBienesUseCases(db: SQLiteDatabase) {
  const bienRepository = new SqliteBienRepository(db);
  const organizacionRepository = new SqliteOrganizacionRepository(db);
  const consolidationTrigger = createConsolidationTrigger(db);
  const syncRepository = new SqliteSyncRepository(db);

  return {
    bienRepository,
    organizacionRepository,
    consultarInventario: new ConsultarInventario(bienRepository, organizacionRepository),
    gestionarBien: new GestionarBien(
      bienRepository,
      organizacionRepository,
      db,
      consolidationTrigger,
      syncRepository,
    ),
  };
}

export function useBienesUseCases() {
  const db = useSQLiteContext();
  return useMemo(() => createBienesUseCases(db), [db]);
}
