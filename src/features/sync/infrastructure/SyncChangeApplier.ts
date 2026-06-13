import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';

import {
  BienesColumns,
  OfrendasColumns,
  OrganizacionesColumns,
  SyncOperacion,
  Tables,
  TiposActividadColumns,
  UsuariosColumns,
} from '@/shared/infrastructure/database/schema';

import type { SyncChange } from '../domain/entities/SyncChange';

function bindValue(value: unknown): SQLiteBindValue {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  return JSON.stringify(value);
}

export class SyncChangeApplier {
  constructor(private readonly db: SQLiteDatabase) {}

  async apply(tabla: string, registroId: string, payload: Record<string, unknown>, operacion: SyncChange['operacion']): Promise<void> {
    if (tabla === Tables.BIENES) {
      await this.applyBien(registroId, payload, operacion);
      return;
    }

    if (tabla === Tables.OFRENDAS) {
      await this.applyOfrenda(registroId, payload, operacion);
      return;
    }

    if (tabla === Tables.ORGANIZACIONES) {
      await this.applyOrganizacion(registroId, payload, operacion);
      return;
    }

    if (tabla === Tables.TIPOS_ACTIVIDAD) {
      await this.applyTipoActividad(registroId, payload, operacion);
      return;
    }

    if (tabla === Tables.USUARIOS) {
      await this.applyUsuario(registroId, payload, operacion);
    }
  }

  private async applyBien(id: string, payload: Record<string, unknown>, operacion: SyncChange['operacion']): Promise<void> {
    if (operacion === SyncOperacion.DELETE || payload.deleted_at) {
      await this.db.runAsync(
        `UPDATE ${Tables.BIENES}
         SET ${BienesColumns.DELETED_AT} = ?,
             ${BienesColumns.UPDATED_AT} = ?,
             ${BienesColumns.UPDATED_BY_DEVICE} = ?,
             ${BienesColumns.SYNC_VECTOR} = ?
         WHERE ${BienesColumns.ID} = ?`,
        [
          bindValue(payload.deleted_at ?? new Date().toISOString()),
          bindValue(payload.updated_at),
          bindValue(payload.updated_by_device ?? ''),
          bindValue(payload.sync_vector ?? '{}'),
          id,
        ],
      );
      return;
    }

    await this.db.runAsync(
      `INSERT INTO ${Tables.BIENES} (
        ${BienesColumns.ID}, ${BienesColumns.ORGANIZACION_ID}, ${BienesColumns.CATEGORIA_ID},
        ${BienesColumns.NOMBRE}, ${BienesColumns.DESCRIPCION}, ${BienesColumns.ESTADO},
        ${BienesColumns.CANTIDAD}, ${BienesColumns.VALOR_ESTIMADO}, ${BienesColumns.FOTO_URI},
        ${BienesColumns.OBSERVACIONES}, ${BienesColumns.SYNC_VECTOR}, ${BienesColumns.UPDATED_AT},
        ${BienesColumns.UPDATED_BY_DEVICE}, ${BienesColumns.DELETED_AT}
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, NULL)
      ON CONFLICT(${BienesColumns.ID}) DO UPDATE SET
        ${BienesColumns.ORGANIZACION_ID} = excluded.${BienesColumns.ORGANIZACION_ID},
        ${BienesColumns.CATEGORIA_ID} = excluded.${BienesColumns.CATEGORIA_ID},
        ${BienesColumns.NOMBRE} = excluded.${BienesColumns.NOMBRE},
        ${BienesColumns.DESCRIPCION} = excluded.${BienesColumns.DESCRIPCION},
        ${BienesColumns.ESTADO} = excluded.${BienesColumns.ESTADO},
        ${BienesColumns.CANTIDAD} = excluded.${BienesColumns.CANTIDAD},
        ${BienesColumns.VALOR_ESTIMADO} = excluded.${BienesColumns.VALOR_ESTIMADO},
        ${BienesColumns.OBSERVACIONES} = excluded.${BienesColumns.OBSERVACIONES},
        ${BienesColumns.SYNC_VECTOR} = excluded.${BienesColumns.SYNC_VECTOR},
        ${BienesColumns.UPDATED_AT} = excluded.${BienesColumns.UPDATED_AT},
        ${BienesColumns.UPDATED_BY_DEVICE} = excluded.${BienesColumns.UPDATED_BY_DEVICE},
        ${BienesColumns.DELETED_AT} = NULL`,
      [
        id,
        bindValue(payload.organizacion_id),
        bindValue(payload.categoria_id),
        bindValue(payload.nombre),
        bindValue(payload.descripcion ?? null),
        bindValue(payload.estado),
        bindValue(payload.cantidad ?? 1),
        bindValue(payload.valor_estimado ?? null),
        bindValue(payload.observaciones ?? null),
        bindValue(payload.sync_vector ?? '{}'),
        bindValue(payload.updated_at),
        bindValue(payload.updated_by_device ?? ''),
      ],
    );
  }

  private async applyOfrenda(id: string, payload: Record<string, unknown>, operacion: SyncChange['operacion']): Promise<void> {
    if (operacion === SyncOperacion.DELETE || payload.deleted_at) {
      await this.db.runAsync(
        `UPDATE ${Tables.OFRENDAS}
         SET ${OfrendasColumns.DELETED_AT} = ?,
             ${OfrendasColumns.UPDATED_AT} = ?,
             ${OfrendasColumns.UPDATED_BY_DEVICE} = ?,
             ${OfrendasColumns.SYNC_VECTOR} = ?
         WHERE ${OfrendasColumns.ID} = ?`,
        [
          bindValue(payload.deleted_at ?? new Date().toISOString()),
          bindValue(payload.updated_at),
          bindValue(payload.updated_by_device ?? ''),
          bindValue(payload.sync_vector ?? '{}'),
          id,
        ],
      );
      return;
    }

    const monto = Math.round(Number(payload.monto ?? 0) * 100) / 100;

    await this.db.runAsync(
      `INSERT INTO ${Tables.OFRENDAS} (
        ${OfrendasColumns.ID}, ${OfrendasColumns.ORGANIZACION_ID}, ${OfrendasColumns.TIPO_ACTIVIDAD_ID},
        ${OfrendasColumns.NATURALEZA}, ${OfrendasColumns.MONTO}, ${OfrendasColumns.FECHA}, ${OfrendasColumns.DESCRIPCION},
        ${OfrendasColumns.SYNC_VECTOR}, ${OfrendasColumns.UPDATED_AT}, ${OfrendasColumns.UPDATED_BY_DEVICE},
        ${OfrendasColumns.DELETED_AT}
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
      ON CONFLICT(${OfrendasColumns.ID}) DO UPDATE SET
        ${OfrendasColumns.ORGANIZACION_ID} = excluded.${OfrendasColumns.ORGANIZACION_ID},
        ${OfrendasColumns.TIPO_ACTIVIDAD_ID} = excluded.${OfrendasColumns.TIPO_ACTIVIDAD_ID},
        ${OfrendasColumns.NATURALEZA} = excluded.${OfrendasColumns.NATURALEZA},
        ${OfrendasColumns.MONTO} = excluded.${OfrendasColumns.MONTO},
        ${OfrendasColumns.FECHA} = excluded.${OfrendasColumns.FECHA},
        ${OfrendasColumns.DESCRIPCION} = excluded.${OfrendasColumns.DESCRIPCION},
        ${OfrendasColumns.SYNC_VECTOR} = excluded.${OfrendasColumns.SYNC_VECTOR},
        ${OfrendasColumns.UPDATED_AT} = excluded.${OfrendasColumns.UPDATED_AT},
        ${OfrendasColumns.UPDATED_BY_DEVICE} = excluded.${OfrendasColumns.UPDATED_BY_DEVICE},
        ${OfrendasColumns.DELETED_AT} = NULL`,
      [
        id,
        bindValue(payload.organizacion_id),
        bindValue(payload.tipo_actividad_id),
        bindValue(payload.naturaleza ?? 'ingreso'),
        monto,
        bindValue(payload.fecha),
        bindValue(payload.descripcion ?? null),
        bindValue(payload.sync_vector ?? '{}'),
        bindValue(payload.updated_at),
        bindValue(payload.updated_by_device ?? ''),
      ],
    );
  }

  private async applyOrganizacion(id: string, payload: Record<string, unknown>, operacion: SyncChange['operacion']): Promise<void> {
    if (operacion === SyncOperacion.DELETE || payload.deleted_at) {
      await this.db.runAsync(
        `UPDATE ${Tables.ORGANIZACIONES}
         SET ${OrganizacionesColumns.DELETED_AT} = ?,
             ${OrganizacionesColumns.UPDATED_AT} = ?,
             ${OrganizacionesColumns.UPDATED_BY_DEVICE} = ?,
             ${OrganizacionesColumns.SYNC_VECTOR} = ?,
             ${OrganizacionesColumns.ACTIVO} = 0
         WHERE ${OrganizacionesColumns.ID} = ?`,
        [
          bindValue(payload.deleted_at ?? new Date().toISOString()),
          bindValue(payload.updated_at),
          bindValue(payload.updated_by_device ?? ''),
          bindValue(payload.sync_vector ?? '{}'),
          id,
        ],
      );
      return;
    }

    await this.db.runAsync(
      `INSERT INTO ${Tables.ORGANIZACIONES} (
        ${OrganizacionesColumns.ID}, ${OrganizacionesColumns.NIVEL_ID}, ${OrganizacionesColumns.PARENT_ID},
        ${OrganizacionesColumns.NOMBRE}, ${OrganizacionesColumns.CODIGO_INTERNO}, ${OrganizacionesColumns.DESCRIPCION},
        ${OrganizacionesColumns.ACTIVO}, ${OrganizacionesColumns.SYNC_VECTOR}, ${OrganizacionesColumns.UPDATED_AT},
        ${OrganizacionesColumns.UPDATED_BY_DEVICE}
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(${OrganizacionesColumns.ID}) DO UPDATE SET
        ${OrganizacionesColumns.NIVEL_ID} = excluded.${OrganizacionesColumns.NIVEL_ID},
        ${OrganizacionesColumns.PARENT_ID} = excluded.${OrganizacionesColumns.PARENT_ID},
        ${OrganizacionesColumns.NOMBRE} = excluded.${OrganizacionesColumns.NOMBRE},
        ${OrganizacionesColumns.CODIGO_INTERNO} = excluded.${OrganizacionesColumns.CODIGO_INTERNO},
        ${OrganizacionesColumns.DESCRIPCION} = excluded.${OrganizacionesColumns.DESCRIPCION},
        ${OrganizacionesColumns.ACTIVO} = excluded.${OrganizacionesColumns.ACTIVO},
        ${OrganizacionesColumns.SYNC_VECTOR} = excluded.${OrganizacionesColumns.SYNC_VECTOR},
        ${OrganizacionesColumns.UPDATED_AT} = excluded.${OrganizacionesColumns.UPDATED_AT},
        ${OrganizacionesColumns.UPDATED_BY_DEVICE} = excluded.${OrganizacionesColumns.UPDATED_BY_DEVICE},
        ${OrganizacionesColumns.DELETED_AT} = NULL`,
      [
        id,
        bindValue(payload.nivel_id),
        bindValue(payload.parent_id ?? null),
        bindValue(payload.nombre),
        bindValue(payload.codigo_interno),
        bindValue(payload.descripcion ?? null),
        bindValue(payload.activo ?? 1),
        bindValue(payload.sync_vector ?? '{}'),
        bindValue(payload.updated_at),
        bindValue(payload.updated_by_device ?? ''),
      ],
    );
  }

  private async applyTipoActividad(
    id: string,
    payload: Record<string, unknown>,
    operacion: SyncChange['operacion'],
  ): Promise<void> {
    if (operacion === SyncOperacion.DELETE) {
      await this.db.runAsync(
        `UPDATE ${Tables.TIPOS_ACTIVIDAD}
         SET ${TiposActividadColumns.ACTIVO} = 0,
             ${TiposActividadColumns.UPDATED_AT} = ?,
             ${TiposActividadColumns.UPDATED_BY_DEVICE} = ?,
             ${TiposActividadColumns.SYNC_VECTOR} = ?
         WHERE ${TiposActividadColumns.ID} = ?`,
        [
          bindValue(payload.updated_at ?? new Date().toISOString()),
          bindValue(payload.updated_by_device ?? ''),
          bindValue(payload.sync_vector ?? '{}'),
          id,
        ],
      );
      return;
    }

    await this.db.runAsync(
      `INSERT INTO ${Tables.TIPOS_ACTIVIDAD} (
        ${TiposActividadColumns.ID}, ${TiposActividadColumns.CODIGO}, ${TiposActividadColumns.NOMBRE},
        ${TiposActividadColumns.NATURALEZA}, ${TiposActividadColumns.ACTIVO}, ${TiposActividadColumns.SYNC_VECTOR},
        ${TiposActividadColumns.UPDATED_AT}, ${TiposActividadColumns.UPDATED_BY_DEVICE}
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(${TiposActividadColumns.ID}) DO UPDATE SET
        ${TiposActividadColumns.CODIGO} = excluded.${TiposActividadColumns.CODIGO},
        ${TiposActividadColumns.NOMBRE} = excluded.${TiposActividadColumns.NOMBRE},
        ${TiposActividadColumns.NATURALEZA} = excluded.${TiposActividadColumns.NATURALEZA},
        ${TiposActividadColumns.ACTIVO} = excluded.${TiposActividadColumns.ACTIVO},
        ${TiposActividadColumns.SYNC_VECTOR} = excluded.${TiposActividadColumns.SYNC_VECTOR},
        ${TiposActividadColumns.UPDATED_AT} = excluded.${TiposActividadColumns.UPDATED_AT},
        ${TiposActividadColumns.UPDATED_BY_DEVICE} = excluded.${TiposActividadColumns.UPDATED_BY_DEVICE}`,
      [
        id,
        bindValue(payload.codigo),
        bindValue(payload.nombre),
        bindValue(payload.naturaleza ?? 'ingreso'),
        bindValue(payload.activo ?? 1),
        bindValue(payload.sync_vector ?? '{}'),
        bindValue(payload.updated_at),
        bindValue(payload.updated_by_device ?? ''),
      ],
    );
  }

  private async applyUsuario(
    id: string,
    payload: Record<string, unknown>,
    operacion: SyncChange['operacion'],
  ): Promise<void> {
    if (operacion === SyncOperacion.DELETE || payload.activo === 0) {
      await this.db.runAsync(
        `UPDATE ${Tables.USUARIOS}
         SET ${UsuariosColumns.ACTIVO} = 0,
             ${UsuariosColumns.UPDATED_AT} = ?
         WHERE ${UsuariosColumns.ID} = ?`,
        [bindValue(payload.updated_at ?? new Date().toISOString()), id],
      );
      return;
    }

    await this.db.runAsync(
      `INSERT INTO ${Tables.USUARIOS} (
        ${UsuariosColumns.ID}, ${UsuariosColumns.ORGANIZACION_ID}, ${UsuariosColumns.ROLE_ID},
        ${UsuariosColumns.USERNAME}, ${UsuariosColumns.NOMBRE}, ${UsuariosColumns.EMAIL},
        ${UsuariosColumns.PIN_HASH}, ${UsuariosColumns.ACTIVO}, ${UsuariosColumns.UPDATED_AT}
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(${UsuariosColumns.ID}) DO UPDATE SET
        ${UsuariosColumns.ORGANIZACION_ID} = excluded.${UsuariosColumns.ORGANIZACION_ID},
        ${UsuariosColumns.ROLE_ID} = excluded.${UsuariosColumns.ROLE_ID},
        ${UsuariosColumns.USERNAME} = excluded.${UsuariosColumns.USERNAME},
        ${UsuariosColumns.NOMBRE} = excluded.${UsuariosColumns.NOMBRE},
        ${UsuariosColumns.EMAIL} = excluded.${UsuariosColumns.EMAIL},
        ${UsuariosColumns.PIN_HASH} = excluded.${UsuariosColumns.PIN_HASH},
        ${UsuariosColumns.ACTIVO} = excluded.${UsuariosColumns.ACTIVO},
        ${UsuariosColumns.UPDATED_AT} = excluded.${UsuariosColumns.UPDATED_AT}`,
      [
        id,
        bindValue(payload.organizacion_id),
        bindValue(payload.role_id),
        bindValue(payload.username ?? null),
        bindValue(payload.nombre),
        bindValue(payload.email ?? null),
        bindValue(payload.pin_hash),
        bindValue(payload.activo ?? 1),
        bindValue(payload.updated_at),
      ],
    );
  }
}
