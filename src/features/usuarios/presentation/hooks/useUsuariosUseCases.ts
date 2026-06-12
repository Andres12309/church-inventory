import type { SQLiteDatabase } from 'expo-sqlite';
import { useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { SqliteOrganizacionRepository } from '@/features/organizaciones/infrastructure/SqliteOrganizacionRepository';

import { ListarUsuariosEnAlcance } from '../../application/use-cases/ListarUsuariosEnAlcance';
import { CrearUsuarioLocal } from '../../application/use-cases/CrearUsuarioLocal';
import { ObtenerOpcionesRegistroUsuario } from '../../application/use-cases/ObtenerOpcionesRegistroUsuario';
import { SqliteUsuarioRepository } from '../../infrastructure/repositories/SqliteUsuarioRepository';

export function createUsuariosUseCases(db: SQLiteDatabase) {
  const usuarioRepository = new SqliteUsuarioRepository(db);
  const organizacionRepository = new SqliteOrganizacionRepository(db);

  return {
    usuarioRepository,
    organizacionRepository,
    crearUsuarioLocal: new CrearUsuarioLocal(usuarioRepository, organizacionRepository),
    obtenerOpcionesRegistroUsuario: new ObtenerOpcionesRegistroUsuario(
      usuarioRepository,
      organizacionRepository,
    ),
    listarUsuariosEnAlcance: new ListarUsuariosEnAlcance(
      usuarioRepository,
      organizacionRepository,
    ),
  };
}

export function useUsuariosUseCases() {
  const db = useSQLiteContext();
  return useMemo(() => createUsuariosUseCases(db), [db]);
}
