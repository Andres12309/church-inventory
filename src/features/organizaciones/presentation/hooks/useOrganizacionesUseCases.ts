import type { SQLiteDatabase } from 'expo-sqlite';
import { useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { createConsolidationService } from '@/shared/infrastructure/background/createConsolidationTrigger';
import { SqliteSyncRepository } from '@/features/sync/infrastructure/SqliteSyncRepository';

import { AdministrarOrganizacion } from '../../application/use-cases/AdministrarOrganizacion';
import { CrearCapilla } from '../../application/use-cases/CrearCapilla';
import { CrearCatedral } from '../../application/use-cases/CrearCatedral';
import { CrearParroquia } from '../../application/use-cases/CrearParroquia';
import { ObtenerEstructuraEclesial } from '../../application/use-cases/ObtenerEstructuraEclesial';
import { SqliteOrganizacionRepository } from '../../infrastructure/SqliteOrganizacionRepository';

export function createOrganizacionesUseCases(db: SQLiteDatabase) {
  const repository = new SqliteOrganizacionRepository(db);
  const syncRepository = new SqliteSyncRepository(db);
  const administrarOrganizacion = new AdministrarOrganizacion(repository, db, syncRepository);
  const consolidationService = createConsolidationService(db);

  return {
    repository,
    obtenerEstructuraEclesial: new ObtenerEstructuraEclesial(repository),
    administrarOrganizacion,
    crearCapilla: new CrearCapilla(administrarOrganizacion, repository, consolidationService),
    crearParroquia: new CrearParroquia(administrarOrganizacion, repository, consolidationService),
    crearCatedral: new CrearCatedral(administrarOrganizacion, repository, consolidationService),
  };
}

export function useOrganizacionesUseCases() {
  const db = useSQLiteContext();
  return useMemo(() => createOrganizacionesUseCases(db), [db]);
}
