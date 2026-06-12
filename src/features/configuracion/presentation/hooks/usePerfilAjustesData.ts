import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { SqliteOrganizacionRepository } from '@/features/organizaciones/infrastructure/SqliteOrganizacionRepository';
import { getOrCreateDeviceId } from '@/shared/infrastructure/sync/SyncContext';
import {
  formatearEtiquetaOta,
  obtenerInfoOtaRuntime,
  type OtaRuntimeInfo,
} from '@/shared/infrastructure/updates/otaUpdateService';
import { runSerializedSqlite, withSqliteLockRetry } from '@/shared/infrastructure/database/sqliteRetry';
import {
  BienesColumns,
  DATABASE_NAME,
  SchemaMigrationsColumns,
  Tables,
} from '@/shared/infrastructure/database/schema';

export type AlmacenamientoLocalInfo = {
  fotosGuardadas: number;
  baseDatosMb: string;
};

export type PerfilAjustesSnapshot = {
  deviceId: string;
  dbVersion: number;
  organizacionNombre: string;
  almacenamiento: AlmacenamientoLocalInfo;
  appVersion: string;
  ota: OtaRuntimeInfo;
  otaEtiqueta: string;
};

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

function formatMegabytes(bytes: number): string {
  if (bytes <= 0) {
    return '0.0 MB';
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function usePerfilAjustesData(organizacionId: string | undefined) {
  const db = useSQLiteContext();
  const orgRepository = useMemo(() => new SqliteOrganizacionRepository(db), [db]);

  const [snapshot, setSnapshot] = useState<PerfilAjustesSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await runSerializedSqlite(() =>
        withSqliteLockRetry(async () => {
          const deviceId = await getOrCreateDeviceId(db);

          const fotosRow = await db.getFirstAsync<{ total: number }>(
            `SELECT COUNT(*) AS total
             FROM ${Tables.BIENES}
             WHERE ${BienesColumns.FOTO_URI} IS NOT NULL
               AND TRIM(${BienesColumns.FOTO_URI}) != ''
               AND ${BienesColumns.DELETED_AT} IS NULL`,
          );

          const versionRow = await db.getFirstAsync<{ version: number }>(
            `SELECT MAX(${SchemaMigrationsColumns.VERSION}) AS version
             FROM ${Tables.SCHEMA_MIGRATIONS}`,
          );

          const organizacion = organizacionId
            ? await orgRepository.obtenerPorId(organizacionId)
            : null;

          return {
            deviceId,
            dbVersion: versionRow?.version ?? 1,
            organizacionNombre: organizacion?.nombre ?? 'Sin organización asignada',
            fotosGuardadas: fotosRow?.total ?? 0,
          };
        }),
      );

      let dbBytes = 0;
      const dbFile = new File(Paths.document, 'SQLite', DATABASE_NAME);
      if (dbFile.exists) {
        dbBytes = dbFile.size;
      }

      const ota = obtenerInfoOtaRuntime();

      return {
        deviceId: data.deviceId,
        dbVersion: data.dbVersion,
        organizacionNombre: data.organizacionNombre,
        almacenamiento: {
          fotosGuardadas: data.fotosGuardadas,
          baseDatosMb: formatMegabytes(dbBytes),
        },
        appVersion: APP_VERSION,
        ota,
        otaEtiqueta: formatearEtiquetaOta(ota),
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudieron cargar los datos del sistema';
      setErrorMessage(message);
      return null;
    }
  }, [db, orgRepository, organizacionId]);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const nextSnapshot = await cargar();
      if (!mounted) {
        return;
      }
      if (nextSnapshot) {
        setSnapshot(nextSnapshot);
      }
      setIsLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [cargar]);

  const recargar = useCallback(async () => {
    setIsLoading(true);
    const nextSnapshot = await cargar();
    if (nextSnapshot) {
      setSnapshot(nextSnapshot);
    }
    setIsLoading(false);
  }, [cargar]);

  return {
    snapshot,
    isLoading,
    errorMessage,
    recargar,
  };
}
