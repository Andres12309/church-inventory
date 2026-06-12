import { v4 as uuidv4 } from 'uuid';

import type { PermissionService } from '@/features/auth/application/services/PermissionService';
import type { Rol } from '@/features/auth/domain/entities/Rol';
import type { Usuario } from '@/features/auth/domain/entities/Usuario';
import type { IOrganizacionRepository } from '@/features/organizaciones/domain/repositories/IOrganizacionRepository';
import type { IConsolidationTrigger } from '@/features/configuracion/application/services/IConsolidationTrigger';
import { SqliteSyncRepository } from '@/features/sync/infrastructure/SqliteSyncRepository';
import { SyncOperacion } from '@/shared/infrastructure/database/schema';
import { registrarBienSync } from '@/shared/infrastructure/sync/SyncChangeRecorder';
import {
  getNextLamportClock,
  getOrCreateDeviceId,
} from '@/shared/infrastructure/sync/SyncContext';
import type { SQLiteDatabase } from 'expo-sqlite';
import { BienEstado } from '@/shared/infrastructure/database/schema';

import type { Bien } from '../../domain/entities/Bien';
import { BienError } from '../../domain/errors/BienError';
import { BienNotFoundError } from '../../domain/errors/BienNotFoundError';
import type { IBienRepository } from '../../domain/repositories/IBienRepository';
import {
  deleteBienPhotoIfExists,
  replaceBienPhoto,
} from '../../infrastructure/ImageStorageService';
import type { GestionarBienInput } from '../dto/GestionarBienInput';
import { tieneAccesoInventario, validarAccesoOrganizacion } from '../services/BienAccessPolicy';

const ESTADOS_VALIDOS = new Set<string>(Object.values(BienEstado));

export class GestionarBien {
  constructor(
    private readonly bienRepository: IBienRepository,
    private readonly organizacionRepository: IOrganizacionRepository,
    private readonly db: SQLiteDatabase,
    private readonly consolidationTrigger: IConsolidationTrigger,
    private readonly syncRepository: SqliteSyncRepository,
  ) {}

  async guardar(
    input: GestionarBienInput,
    usuario: Usuario,
    rol: Rol,
    permissionService: PermissionService,
  ): Promise<Bien> {
    if (!tieneAccesoInventario(permissionService)) {
      throw new BienError('Sin acceso al módulo de inventario');
    }

    this.validarCampos(input);
    await validarAccesoOrganizacion(
      input.organizacionId,
      usuario,
      rol,
      this.organizacionRepository,
      'write',
    );

    const deviceId = await getOrCreateDeviceId(this.db);
    const now = new Date().toISOString();
    const id = input.id ?? uuidv4();

    const existente = input.id ? await this.bienRepository.obtenerPorId(input.id) : null;
    if (input.id && !existente) {
      throw new BienNotFoundError(input.id);
    }

    if (existente && existente.organizacionId !== input.organizacionId) {
      throw new BienError('No se puede cambiar la capilla de un bien existente');
    }

    let fotoUri = input.fotoUri ?? existente?.fotoUri ?? null;

    if (input.eliminarFoto) {
      await deleteBienPhotoIfExists(fotoUri);
      fotoUri = null;
    } else if (input.nuevaFotoTempUri) {
      fotoUri = await replaceBienPhoto(id, input.nuevaFotoTempUri, existente?.fotoUri);
    }

    const bien: Bien = {
      id,
      organizacionId: input.organizacionId,
      categoriaId: input.categoriaId,
      nombre: input.nombre.trim(),
      descripcion: input.descripcion?.trim() ?? null,
      estado: input.estado,
      cantidad: input.cantidad,
      valorEstimado: input.valorEstimado ?? null,
      fotoUri,
      observaciones: input.observaciones?.trim() ?? null,
      activo: true,
      syncVector: existente?.syncVector ?? '{}',
      updatedAt: now,
      updatedByDevice: deviceId,
    };

    await this.bienRepository.guardar(bien);
    await registrarBienSync(
      this.db,
      this.syncRepository,
      bien.id,
      existente ? SyncOperacion.UPDATE : SyncOperacion.INSERT,
    );
    this.consolidationTrigger.dispararParaOrganizacion(bien.organizacionId);
    return bien;
  }

  async eliminar(
    id: string,
    usuario: Usuario,
    rol: Rol,
    permissionService: PermissionService,
  ): Promise<void> {
    if (!tieneAccesoInventario(permissionService)) {
      throw new BienError('Sin acceso al módulo de inventario');
    }

    const existente = await this.bienRepository.obtenerPorId(id);
    if (!existente) {
      throw new BienNotFoundError(id);
    }

    await validarAccesoOrganizacion(
      existente.organizacionId,
      usuario,
      rol,
      this.organizacionRepository,
      'write',
    );

    const deviceId = await getOrCreateDeviceId(this.db);
    const lamportClock = await getNextLamportClock(this.db);

    await this.bienRepository.eliminarLogico(id, deviceId, lamportClock);
    await deleteBienPhotoIfExists(existente.fotoUri);
    await registrarBienSync(this.db, this.syncRepository, id, SyncOperacion.DELETE);
    this.consolidationTrigger.dispararParaOrganizacion(existente.organizacionId);
  }

  private validarCampos(input: GestionarBienInput): void {
    if (!input.nombre.trim()) {
      throw new BienError('El nombre del bien es obligatorio');
    }

    if (!input.categoriaId) {
      throw new BienError('Selecciona una categoría');
    }

    if (!ESTADOS_VALIDOS.has(input.estado)) {
      throw new BienError('Estado del bien inválido');
    }

    if (!Number.isInteger(input.cantidad) || input.cantidad < 1) {
      throw new BienError('La cantidad debe ser un entero mayor a cero');
    }

    if (
      input.valorEstimado != null &&
      (Number.isNaN(input.valorEstimado) || input.valorEstimado < 0)
    ) {
      throw new BienError('El valor estimado debe ser un número positivo');
    }
  }
}
