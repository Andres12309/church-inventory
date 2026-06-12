import type { SQLiteDatabase } from 'expo-sqlite';
import { useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { AutenticarConPin } from '../../application/use-cases/AutenticarConPin';
import { RestaurarSesion } from '../../application/use-cases/RestaurarSesion';
import { SqliteUsuarioRepository } from '../../infrastructure/SqliteUsuarioRepository';

export function createAuthUseCases(db: SQLiteDatabase) {
  const repository = new SqliteUsuarioRepository(db);

  return {
    repository,
    autenticarConPin: new AutenticarConPin(repository),
    restaurarSesion: new RestaurarSesion(repository),
  };
}

export function useAuthUseCases() {
  const db = useSQLiteContext();
  return useMemo(() => createAuthUseCases(db), [db]);
}
