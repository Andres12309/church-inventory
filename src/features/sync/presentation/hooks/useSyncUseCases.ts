import type { SQLiteDatabase } from 'expo-sqlite';
import { useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { ConsolidationService } from '@/shared/infrastructure/background/ConsolidationService';
import { SqliteOrganizacionRepository } from '@/features/organizaciones/infrastructure/SqliteOrganizacionRepository';

import { SyncOrchestrator } from '../../application/SyncOrchestrator';
import { SqliteSyncRepository } from '../../infrastructure/SqliteSyncRepository';
import { TcpSocketService } from '../../infrastructure/TcpSocketService';
import { ZeroconfDiscoveryService } from '../../infrastructure/ZeroconfDiscoveryService';

export function createSyncUseCases(db: SQLiteDatabase) {
  const discovery = new ZeroconfDiscoveryService();
  const socketService = new TcpSocketService();
  const syncRepository = new SqliteSyncRepository(db);
  const consolidationService = new ConsolidationService(db);
  const organizacionRepository = new SqliteOrganizacionRepository(db);

  const orchestrator = new SyncOrchestrator(
    discovery,
    socketService,
    syncRepository,
    consolidationService,
  );

  return {
    orchestrator,
    syncRepository,
    organizacionRepository,
  };
}

export function useSyncUseCases() {
  const db = useSQLiteContext();
  return useMemo(() => createSyncUseCases(db), [db]);
}
