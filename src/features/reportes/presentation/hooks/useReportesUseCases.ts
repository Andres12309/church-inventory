import type { SQLiteDatabase } from 'expo-sqlite';
import { useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { SqliteBienRepository } from '@/features/bienes/infrastructure/SqliteBienRepository';
import { GestionarTipoActividad } from '@/features/ofrendas/application/use-cases/GestionarTipoActividad';
import { SqliteOfrendaRepository } from '@/features/ofrendas/infrastructure/SqliteOfrendaRepository';
import { SqliteOrganizacionRepository } from '@/features/organizaciones/infrastructure/SqliteOrganizacionRepository';
import { SqliteSyncRepository } from '@/features/sync/infrastructure/SqliteSyncRepository';
import { createConsolidationTrigger } from '@/shared/infrastructure/background/createConsolidationTrigger';

import { CompartirReporte } from '../../application/use-cases/CompartirReporte';
import { GenerarReporteXlsx } from '../../application/use-cases/GenerarReporteXlsx';
import { ImportarReporteXlsx } from '../../application/use-cases/ImportarReporteXlsx';
import { ListarReportesEnAlcance } from '../../application/use-cases/ListarReportesEnAlcance';
import { SqliteReporteDataRepository } from '../../infrastructure/SqliteReporteDataRepository';
import { SqliteReporteRepository } from '../../infrastructure/SqliteReporteRepository';

export function createReportesUseCases(db: SQLiteDatabase) {
  const reporteRepository = new SqliteReporteRepository(db);
  const reporteDataRepository = new SqliteReporteDataRepository(db);
  const organizacionRepository = new SqliteOrganizacionRepository(db);
  const bienRepository = new SqliteBienRepository(db);
  const ofrendaRepository = new SqliteOfrendaRepository(db);
  const consolidationTrigger = createConsolidationTrigger(db);
  const syncRepository = new SqliteSyncRepository(db);
  const gestionarTipoActividad = new GestionarTipoActividad(
    ofrendaRepository,
    db,
    syncRepository,
  );

  return {
    listarReportesEnAlcance: new ListarReportesEnAlcance(reporteRepository, organizacionRepository),
    generarReporteXlsx: new GenerarReporteXlsx(
      reporteRepository,
      reporteDataRepository,
      organizacionRepository,
    ),
    importarReporteXlsx: new ImportarReporteXlsx(
      bienRepository,
      ofrendaRepository,
      organizacionRepository,
      gestionarTipoActividad,
      db,
      consolidationTrigger,
      syncRepository,
    ),
    compartirReporte: new CompartirReporte(),
  };
}

export function useReportesUseCases() {
  const db = useSQLiteContext();
  return useMemo(() => createReportesUseCases(db), [db]);
}
