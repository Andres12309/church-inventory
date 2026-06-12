import { useEffect } from 'react';
import { Platform } from 'react-native';

import { registerConsolidationBackgroundTask } from '@/shared/infrastructure/background/consolidationTask';
import { registerPurgeSyncBackgroundTask } from '@/shared/infrastructure/background/purgeSyncChangesTask';

export function ConsolidationBootstrap() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    void registerConsolidationBackgroundTask().catch((error: unknown) => {
      console.warn('[ConsolidationBootstrap] No se pudo registrar background fetch:', error);
    });

    void registerPurgeSyncBackgroundTask().catch((error: unknown) => {
      console.warn('[ConsolidationBootstrap] No se pudo registrar purga sync:', error);
    });
  }, []);

  return null;
}
