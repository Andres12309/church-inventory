import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { DATABASE_NAME, SyncChangesColumns, SyncSessionsColumns, Tables } from '@/shared/infrastructure/database/schema';

export const PURGE_SYNC_CHANGES_TASK = 'PURGE_SYNC_CHANGES_TASK';

const ONE_DAY_IN_SECONDS = 60 * 60 * 24;

TaskManager.defineTask(PURGE_SYNC_CHANGES_TASK, async () => {
  let db: SQLiteDatabase | null = null;

  try {
    db = await openDatabaseAsync(DATABASE_NAME, { useNewConnection: true });

    await db.runAsync(
      `DELETE FROM ${Tables.SYNC_CHANGES}
       WHERE ${SyncChangesColumns.CREATED_AT} < datetime('now', '-60 days')`,
    );

    await db.runAsync(
      `DELETE FROM ${Tables.SYNC_SESSIONS}
       WHERE ${SyncSessionsColumns.STARTED_AT} < datetime('now', '-90 days')`,
    );

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('[PURGE_SYNC_CHANGES_TASK] Error en purga:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  } finally {
    if (db) {
      try {
        await db.closeAsync();
      } catch (closeError) {
        console.warn('[PURGE_SYNC_CHANGES_TASK] Error al cerrar BD:', closeError);
      }
    }
  }
});

export async function registerPurgeSyncBackgroundTask(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(PURGE_SYNC_CHANGES_TASK);
  if (isRegistered) {
    return;
  }

  await BackgroundFetch.registerTaskAsync(PURGE_SYNC_CHANGES_TASK, {
    minimumInterval: ONE_DAY_IN_SECONDS,
    stopOnTerminate: false,
    startOnBoot: true,
  });
}
