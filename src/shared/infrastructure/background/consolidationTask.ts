import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { DATABASE_NAME } from '@/shared/infrastructure/database/schema';

import { ConsolidationService } from './ConsolidationService';

export const CONSOLIDATION_TASK = 'CONSOLIDATION_TASK';

const SIX_HOURS_IN_SECONDS = 60 * 60 * 6;

TaskManager.defineTask(CONSOLIDATION_TASK, async () => {
  let db: SQLiteDatabase | null = null;

  try {
    db = await openDatabaseAsync(DATABASE_NAME, { useNewConnection: true });
    const service = new ConsolidationService(db);
    await service.consolidarTodoElArbol();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('[CONSOLIDATION_TASK] Error en consolidación background:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  } finally {
    if (db) {
      try {
        await db.closeAsync();
      } catch (closeError) {
        console.warn('[CONSOLIDATION_TASK] Error al cerrar la BD:', closeError);
      }
    }
  }
});

export async function registerConsolidationBackgroundTask(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(CONSOLIDATION_TASK);
  if (isRegistered) {
    return;
  }

  await BackgroundFetch.registerTaskAsync(CONSOLIDATION_TASK, {
    minimumInterval: SIX_HOURS_IN_SECONDS,
    stopOnTerminate: false,
    startOnBoot: true,
  });
}

export async function unregisterConsolidationBackgroundTask(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(CONSOLIDATION_TASK);
  if (!isRegistered) {
    return;
  }

  await BackgroundFetch.unregisterTaskAsync(CONSOLIDATION_TASK);
}
