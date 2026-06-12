import type { SQLiteDatabase } from 'expo-sqlite';

import {
  TIPOS_ACTIVIDAD_SEED_PREFIX,
  TIPOS_ACTIVIDAD_V1,
} from '@/shared/config/tiposActividad';
import { Tables, TiposActividadColumns } from '@/shared/infrastructure/database/schema';

function buildNotInClause(ids: string[]): { sql: string; params: string[] } {
  if (ids.length === 0) {
    return { sql: '1 = 1', params: [] };
  }
  const placeholders = ids.map(() => '?').join(', ');
  return { sql: `id NOT IN (${placeholders})`, params: ids };
}

export async function ensureTiposActividadSeed(db: SQLiteDatabase): Promise<void> {
  const now = new Date().toISOString();
  const configIds = TIPOS_ACTIVIDAD_V1.map((tipo) => tipo.id);

  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const tipo of TIPOS_ACTIVIDAD_V1) {
      const activo = tipo.activo !== false ? 1 : 0;
      await txn.runAsync(
        `INSERT INTO ${Tables.TIPOS_ACTIVIDAD} (
          ${TiposActividadColumns.ID},
          ${TiposActividadColumns.CODIGO},
          ${TiposActividadColumns.NOMBRE},
          ${TiposActividadColumns.NATURALEZA},
          ${TiposActividadColumns.ACTIVO},
          ${TiposActividadColumns.SYNC_VECTOR},
          ${TiposActividadColumns.UPDATED_AT},
          ${TiposActividadColumns.UPDATED_BY_DEVICE}
        ) VALUES (?, ?, ?, ?, ?, '{}', ?, '')
        ON CONFLICT(${TiposActividadColumns.ID}) DO UPDATE SET
          ${TiposActividadColumns.CODIGO} = excluded.${TiposActividadColumns.CODIGO},
          ${TiposActividadColumns.NOMBRE} = excluded.${TiposActividadColumns.NOMBRE},
          ${TiposActividadColumns.NATURALEZA} = excluded.${TiposActividadColumns.NATURALEZA},
          ${TiposActividadColumns.ACTIVO} = excluded.${TiposActividadColumns.ACTIVO},
          ${TiposActividadColumns.UPDATED_AT} = excluded.${TiposActividadColumns.UPDATED_AT}`,
        [tipo.id, tipo.codigo, tipo.nombre, tipo.naturaleza, activo, now],
      );
    }

    const notIn = buildNotInClause(configIds);
    await txn.runAsync(
      `UPDATE ${Tables.TIPOS_ACTIVIDAD}
       SET ${TiposActividadColumns.ACTIVO} = 0,
           ${TiposActividadColumns.UPDATED_AT} = ?
       WHERE id LIKE ? || '%' AND ${notIn.sql}`,
      [now, TIPOS_ACTIVIDAD_SEED_PREFIX, ...notIn.params],
    );
  });
}
