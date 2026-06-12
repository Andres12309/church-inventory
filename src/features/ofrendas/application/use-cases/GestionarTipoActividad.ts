import { v4 as uuidv4 } from 'uuid';

import type { PermissionService } from '@/features/auth/application/services/PermissionService';
import { SqliteSyncRepository } from '@/features/sync/infrastructure/SqliteSyncRepository';
import { SyncOperacion } from '@/shared/infrastructure/database/schema';
import { registrarTipoActividadSync } from '@/shared/infrastructure/sync/SyncChangeRecorder';
import { getOrCreateDeviceId } from '@/shared/infrastructure/sync/SyncContext';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { TipoActividad } from '../../domain/entities/TipoActividad';
import { OfrendaError } from '../../domain/errors/OfrendaError';
import type { IOfrendaRepository } from '../../domain/repositories/IOfrendaRepository';
import {
  codigoTipoActividadUnico,
  slugTipoActividadCodigo,
} from '../services/tipoActividadCodigo';
import { tieneAccesoOfrendas } from '../services/OfrendaAccessPolicy';

export type CrearTipoActividadInput = {
  nombre: string;
};

export type UpsertTipoActividadInput = {
  id: string;
  codigo?: string;
  nombre: string;
  activo?: boolean;
  updatedAt?: string;
  updatedByDevice?: string;
  syncVector?: string;
};

export class GestionarTipoActividad {
  constructor(
    private readonly ofrendaRepository: IOfrendaRepository,
    private readonly db: SQLiteDatabase,
    private readonly syncRepository: SqliteSyncRepository,
  ) {}

  async listar(permissionService: PermissionService): Promise<TipoActividad[]> {
    if (!tieneAccesoOfrendas(permissionService)) {
      throw new OfrendaError('Sin acceso al módulo de ofrendas');
    }

    return this.ofrendaRepository.listarTiposActividad();
  }

  async crear(
    input: CrearTipoActividadInput,
    permissionService: PermissionService,
  ): Promise<TipoActividad> {
    if (!tieneAccesoOfrendas(permissionService)) {
      throw new OfrendaError('Sin acceso al módulo de ofrendas');
    }

    const nombre = input.nombre.trim();
    if (nombre.length < 2) {
      throw new OfrendaError('El nombre del tipo debe tener al menos 2 caracteres');
    }

    const existentes = await this.ofrendaRepository.listarTiposActividad();
    const nombreDuplicado = existentes.some(
      (tipo) => tipo.nombre.trim().toLowerCase() === nombre.toLowerCase(),
    );
    if (nombreDuplicado) {
      throw new OfrendaError('Ya existe un tipo de actividad con ese nombre');
    }

    const codigos = new Set(existentes.map((tipo) => tipo.codigo));
    const codigo = codigoTipoActividadUnico(slugTipoActividadCodigo(nombre), codigos);
    const deviceId = await getOrCreateDeviceId(this.db);
    const now = new Date().toISOString();

    const tipo: TipoActividad = {
      id: uuidv4(),
      codigo,
      nombre,
      activo: true,
      syncVector: '{}',
      updatedAt: now,
      updatedByDevice: deviceId,
    };

    await this.ofrendaRepository.guardarTipoActividad(tipo);
    await registrarTipoActividadSync(this.db, this.syncRepository, tipo.id, SyncOperacion.INSERT);

    return tipo;
  }

  async resolverPorNombre(
    nombre: string,
    permissionService: PermissionService,
  ): Promise<TipoActividad> {
    const normalized = nombre.trim();
    if (!normalized) {
      throw new OfrendaError('Nombre de tipo de actividad requerido');
    }

    const existentes = await this.ofrendaRepository.listarTiposActividad();
    const match = existentes.find(
      (tipo) => tipo.nombre.trim().toLowerCase() === normalized.toLowerCase(),
    );
    if (match) {
      return match;
    }

    return this.crear({ nombre: normalized }, permissionService);
  }

  async upsertDesdeIntercambio(
    input: UpsertTipoActividadInput,
    permissionService: PermissionService,
  ): Promise<TipoActividad> {
    if (!tieneAccesoOfrendas(permissionService)) {
      throw new OfrendaError('Sin acceso al módulo de ofrendas');
    }

    const nombre = input.nombre.trim();
    if (!nombre) {
      throw new OfrendaError('Tipo de actividad sin nombre');
    }

    const existente =
      (await this.ofrendaRepository.obtenerTipoActividadPorId(input.id)) ??
      (input.codigo
        ? await this.ofrendaRepository.obtenerTipoActividadPorCodigo(input.codigo)
        : null);

    const deviceId = await getOrCreateDeviceId(this.db);
    const now = new Date().toISOString();
    const incomingUpdatedAt = input.updatedAt ?? now;

    if (
      existente &&
      incomingUpdatedAt <= existente.updatedAt &&
      existente.nombre === nombre &&
      existente.activo === (input.activo ?? true)
    ) {
      return existente;
    }

    const todos = await this.ofrendaRepository.listarTiposActividad();
    const codigos = new Set(todos.map((tipo) => tipo.codigo));
    const codigo =
      input.codigo ??
      existente?.codigo ??
      codigoTipoActividadUnico(slugTipoActividadCodigo(nombre), codigos);

    const tipo: TipoActividad = {
      id: existente?.id ?? input.id,
      codigo,
      nombre,
      activo: input.activo ?? true,
      syncVector: input.syncVector ?? existente?.syncVector ?? '{}',
      updatedAt: incomingUpdatedAt,
      updatedByDevice: input.updatedByDevice ?? deviceId,
    };

    await this.ofrendaRepository.guardarTipoActividad(tipo);
    await registrarTipoActividadSync(
      this.db,
      this.syncRepository,
      tipo.id,
      existente ? SyncOperacion.UPDATE : SyncOperacion.INSERT,
    );

    return tipo;
  }
}
