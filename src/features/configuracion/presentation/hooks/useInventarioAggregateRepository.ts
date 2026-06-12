import { useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { SqliteInventarioAggregateRepository } from '../../infrastructure/SqliteInventarioAggregateRepository';

export function useInventarioAggregateRepository() {
  const db = useSQLiteContext();
  return useMemo(() => new SqliteInventarioAggregateRepository(db), [db]);
}
