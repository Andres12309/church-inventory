import type { SQLiteDatabase } from 'expo-sqlite';

import {
  BienesColumns,
  ModulosColumns,
  OfrendasColumns,
  OrganizacionesColumns,
  Tables,
  UsuariosColumns,
} from '@/shared/infrastructure/database/schema';

import type { ModuloResumen, ResumenSistema } from '../domain/entities/ResumenSistema';
import type { ISistemaRepository } from '../domain/repositories/ISistemaRepository';

export class SqliteSistemaRepository implements ISistemaRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async obtenerResumen(): Promise<ResumenSistema> {
    const modulosRows = await this.db.getAllAsync<{
      id: string;
      codigo: string;
      nombre: string;
      ruta: string;
      activo: number;
    }>(
      `SELECT
        ${ModulosColumns.ID} AS id,
        ${ModulosColumns.CODIGO} AS codigo,
        ${ModulosColumns.NOMBRE} AS nombre,
        ${ModulosColumns.RUTA} AS ruta,
        ${ModulosColumns.ACTIVO} AS activo
       FROM ${Tables.MODULOS}
       WHERE ${ModulosColumns.ACTIVO} = 1
       ORDER BY ${ModulosColumns.ORDEN} ASC`,
    );

    const usuariosRow = await this.db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) AS total FROM ${Tables.USUARIOS} WHERE ${UsuariosColumns.ACTIVO} = 1`,
    );

    const orgsRow = await this.db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) AS total
       FROM ${Tables.ORGANIZACIONES}
       WHERE ${OrganizacionesColumns.ACTIVO} = 1
         AND ${OrganizacionesColumns.DELETED_AT} IS NULL`,
    );

    const bienesRow = await this.db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) AS total
       FROM ${Tables.BIENES}
       WHERE ${BienesColumns.DELETED_AT} IS NULL`,
    );

    const ofrendasRow = await this.db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) AS total
       FROM ${Tables.OFRENDAS}
       WHERE ${OfrendasColumns.DELETED_AT} IS NULL`,
    );

    const modulosActivos: ModuloResumen[] = modulosRows.map((row) => ({
      id: row.id,
      codigo: row.codigo,
      nombre: row.nombre,
      ruta: row.ruta,
      activo: row.activo === 1,
    }));

    return {
      modulosActivos,
      totalUsuariosActivos: usuariosRow?.total ?? 0,
      totalOrganizacionesActivas: orgsRow?.total ?? 0,
      totalBienes: bienesRow?.total ?? 0,
      totalOfrendas: ofrendasRow?.total ?? 0,
    };
  }
}
