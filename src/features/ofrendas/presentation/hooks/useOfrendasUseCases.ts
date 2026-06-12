import type { SQLiteDatabase } from 'expo-sqlite';
import { useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { SqliteOrganizacionRepository } from '@/features/organizaciones/infrastructure/SqliteOrganizacionRepository';

import { SqliteSyncRepository } from '@/features/sync/infrastructure/SqliteSyncRepository';
import { createConsolidationTrigger } from '@/shared/infrastructure/background/createConsolidationTrigger';

import { ConsultarFinanzas } from '../../application/use-cases/ConsultarFinanzas';
import { GestionarTipoActividad } from '../../application/use-cases/GestionarTipoActividad';
import { RegistrarRecaudacion } from '../../application/use-cases/RegistrarRecaudacion';
import { SqliteOfrendaRepository } from '../../infrastructure/SqliteOfrendaRepository';

export function createOfrendasUseCases(db: SQLiteDatabase) {
  const ofrendaRepository = new SqliteOfrendaRepository(db);
  const organizacionRepository = new SqliteOrganizacionRepository(db);
  const consolidationTrigger = createConsolidationTrigger(db);
  const syncRepository = new SqliteSyncRepository(db);

  return {
    ofrendaRepository,
    organizacionRepository,
    consultarFinanzas: new ConsultarFinanzas(ofrendaRepository, organizacionRepository),
    gestionarTipoActividad: new GestionarTipoActividad(
      ofrendaRepository,
      db,
      syncRepository,
    ),
    registrarRecaudacion: new RegistrarRecaudacion(
      ofrendaRepository,
      organizacionRepository,
      db,
      consolidationTrigger,
      syncRepository,
    ),
  };
}

export function useOfrendasUseCases() {
  const db = useSQLiteContext();
  return useMemo(() => createOfrendasUseCases(db), [db]);
}
