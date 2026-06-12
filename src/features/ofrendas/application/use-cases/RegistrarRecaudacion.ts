import { v4 as uuidv4 } from 'uuid';

import type { PermissionService } from '@/features/auth/application/services/PermissionService';
import type { Rol } from '@/features/auth/domain/entities/Rol';
import type { Usuario } from '@/features/auth/domain/entities/Usuario';
import type { IOrganizacionRepository } from '@/features/organizaciones/domain/repositories/IOrganizacionRepository';
import type { IConsolidationTrigger } from '@/features/configuracion/application/services/IConsolidationTrigger';
import { SqliteSyncRepository } from '@/features/sync/infrastructure/SqliteSyncRepository';
import { SyncOperacion } from '@/shared/infrastructure/database/schema';
import { registrarOfrendaSync } from '@/shared/infrastructure/sync/SyncChangeRecorder';
import {
  getNextLamportClock,
  getOrCreateDeviceId,
} from '@/shared/infrastructure/sync/SyncContext';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { Ofrenda } from '../../domain/entities/Ofrenda';
import { OfrendaError } from '../../domain/errors/OfrendaError';
import { OfrendaNotFoundError } from '../../domain/errors/OfrendaNotFoundError';
import type { IOfrendaRepository } from '../../domain/repositories/IOfrendaRepository';
import { redondearMonto } from '../../infrastructure/OfrendaMapper';
import type { RegistrarRecaudacionInput } from '../dto/RegistrarRecaudacionInput';
import {
  obtenerFechaHoyIso,
  tieneAccesoOfrendas,
  validarAccesoOrganizacion,
} from '../services/OfrendaAccessPolicy';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class RegistrarRecaudacion {
  constructor(
    private readonly ofrendaRepository: IOfrendaRepository,
    private readonly organizacionRepository: IOrganizacionRepository,
    private readonly db: SQLiteDatabase,
    private readonly consolidationTrigger: IConsolidationTrigger,
    private readonly syncRepository: SqliteSyncRepository,
  ) {}

  async guardar(
    input: RegistrarRecaudacionInput,
    usuario: Usuario,
    rol: Rol,
    permissionService: PermissionService,
  ): Promise<Ofrenda> {
    if (!tieneAccesoOfrendas(permissionService)) {
      throw new OfrendaError('Sin acceso al módulo de ofrendas');
    }

    this.validarCampos(input);
    await validarAccesoOrganizacion(
      input.organizacionId,
      usuario,
      rol,
      this.organizacionRepository,
    );

    const deviceId = await getOrCreateDeviceId(this.db);
    const now = new Date().toISOString();
    const id = input.id ?? uuidv4();

    const existente = input.id ? await this.ofrendaRepository.obtenerPorId(input.id) : null;
    if (input.id && !existente) {
      throw new OfrendaNotFoundError(input.id);
    }

    if (existente && existente.organizacionId !== input.organizacionId) {
      throw new OfrendaError('No se puede cambiar la organización de una recaudación existente');
    }

    const ofrenda: Ofrenda = {
      id,
      organizacionId: input.organizacionId,
      tipoActividadId: input.tipoActividadId,
      monto: redondearMonto(input.monto),
      fecha: input.fecha,
      descripcion: input.descripcion?.trim() ?? null,
      activo: true,
      syncVector: existente?.syncVector ?? '{}',
      updatedAt: now,
      updatedByDevice: deviceId,
    };

    await this.ofrendaRepository.guardar(ofrenda);
    await registrarOfrendaSync(
      this.db,
      this.syncRepository,
      ofrenda.id,
      existente ? SyncOperacion.UPDATE : SyncOperacion.INSERT,
    );
    this.consolidationTrigger.dispararParaOrganizacion(ofrenda.organizacionId);
    return ofrenda;
  }

  async eliminar(
    id: string,
    usuario: Usuario,
    rol: Rol,
    permissionService: PermissionService,
  ): Promise<void> {
    if (!tieneAccesoOfrendas(permissionService)) {
      throw new OfrendaError('Sin acceso al módulo de ofrendas');
    }

    const existente = await this.ofrendaRepository.obtenerPorId(id);
    if (!existente) {
      throw new OfrendaNotFoundError(id);
    }

    await validarAccesoOrganizacion(
      existente.organizacionId,
      usuario,
      rol,
      this.organizacionRepository,
    );

    const deviceId = await getOrCreateDeviceId(this.db);
    const lamportClock = await getNextLamportClock(this.db);
    await this.ofrendaRepository.eliminarLogico(id, deviceId, lamportClock);
    await registrarOfrendaSync(this.db, this.syncRepository, id, SyncOperacion.DELETE);
    this.consolidationTrigger.dispararParaOrganizacion(existente.organizacionId);
  }

  private validarCampos(input: RegistrarRecaudacionInput): void {
    const monto = redondearMonto(input.monto);

    if (!Number.isFinite(monto) || monto <= 0) {
      throw new OfrendaError('Monto inválido: debe ser mayor a cero');
    }

    if (!input.tipoActividadId) {
      throw new OfrendaError('Selecciona un tipo de actividad');
    }

    if (!ISO_DATE_REGEX.test(input.fecha)) {
      throw new OfrendaError('Fecha inválida: use el formato YYYY-MM-DD');
    }

    const hoy = obtenerFechaHoyIso();
    if (input.fecha > hoy) {
      throw new OfrendaError('La fecha no puede ser futura');
    }
  }
}
