import { v4 as uuidv4 } from 'uuid';

import type { PermissionService } from '@/features/auth/application/services/PermissionService';
import type { Rol } from '@/features/auth/domain/entities/Rol';
import type { Usuario } from '@/features/auth/domain/entities/Usuario';
import { SqliteSyncRepository } from '@/features/sync/infrastructure/SqliteSyncRepository';
import type { NivelOrganizacionCodigo } from '@/shared/config/hierarchy';
import { puedeCrearNivelOrganizacion } from '@/shared/config/hierarchyAccess';
import { SeedIds, SyncOperacion, UserRoleCodigo } from '@/shared/infrastructure/database/schema';
import {
  getNextLamportClock,
  getOrCreateDeviceId,
} from '@/shared/infrastructure/sync/SyncContext';
import { registrarOrganizacionSync } from '@/shared/infrastructure/sync/SyncChangeRecorder';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { Organizacion } from '../../domain/entities/Organizacion';
import type { Ubicacion } from '../../domain/entities/Ubicacion';
import { OrganizacionNotFoundError } from '../../domain/errors/OrganizacionNotFoundError';
import { OrganizacionPermissionDeniedError } from '../../domain/errors/OrganizacionPermissionDeniedError';
import { OrganizacionValidationError } from '../../domain/errors/OrganizacionValidationError';
import type { IOrganizacionRepository } from '../../domain/repositories/IOrganizacionRepository';
import type { GuardarOrganizacionInput } from '../dto/EstructuraEclesial';
import {
  puedeAdministrarOrganizaciones,
  resolverAlcanceOrganizaciones,
} from '../services/OrganizacionAccessPolicy';

export class AdministrarOrganizacion {
  constructor(
    private readonly repository: IOrganizacionRepository,
    private readonly db: SQLiteDatabase,
    private readonly syncRepository: SqliteSyncRepository,
  ) {}

  async guardar(
    input: GuardarOrganizacionInput,
    usuario: Usuario,
    rol: Rol,
    permissionService: PermissionService,
  ): Promise<Organizacion> {
    if (!puedeAdministrarOrganizaciones(permissionService, rol)) {
      throw new OrganizacionPermissionDeniedError();
    }

    await this.validarJerarquia(input);
    await this.validarAlcance(input, usuario, rol);

    const nivel = await this.repository.obtenerNivelPorId(input.nivelId);
    if (nivel && !input.id && !puedeCrearNivelOrganizacion(rol.codigo, nivel.codigo as NivelOrganizacionCodigo)) {
      throw new OrganizacionPermissionDeniedError();
    }

    let codigoInterno = input.codigoInterno?.trim() ?? '';

    if (input.id) {
      const existente = await this.repository.obtenerPorId(input.id);
      if (!existente) {
        throw new OrganizacionNotFoundError(input.id);
      }
      if (!codigoInterno) {
        codigoInterno = existente.codigoInterno;
      }
    }

    if (!codigoInterno) {
      throw new OrganizacionValidationError('No se pudo determinar el código interno de la organización');
    }

    const organizacion: Organizacion = {
      id: input.id ?? uuidv4(),
      nivelId: input.nivelId,
      parentId: input.parentId,
      nombre: input.nombre.trim(),
      codigoInterno,
      descripcion: input.descripcion?.trim() ?? null,
      activo: input.activo ?? true,
    };

    let ubicacion: Ubicacion | undefined;

    if (input.ubicacion) {
      ubicacion = {
        id: input.ubicacion.id ?? uuidv4(),
        organizacionId: organizacion.id,
        direccion: input.ubicacion.direccion.trim(),
        ciudad: input.ubicacion.ciudad?.trim() ?? null,
        provincia: input.ubicacion.provincia?.trim() ?? null,
        pais: input.ubicacion.pais ?? 'EC',
        latitud: input.ubicacion.latitud ?? null,
        longitud: input.ubicacion.longitud ?? null,
      };
    }

    await this.repository.guardar(organizacion, ubicacion);

    await registrarOrganizacionSync(
      this.db,
      this.syncRepository,
      organizacion.id,
      input.id ? SyncOperacion.UPDATE : SyncOperacion.INSERT,
    );

    return organizacion;
  }

  async eliminar(
    id: string,
    usuario: Usuario,
    rol: Rol,
    permissionService: PermissionService,
  ): Promise<void> {
    if (!puedeAdministrarOrganizaciones(permissionService, rol)) {
      throw new OrganizacionPermissionDeniedError();
    }

    const existente = await this.repository.obtenerPorId(id);
    if (!existente) {
      throw new OrganizacionNotFoundError(id);
    }

    await this.validarAlcance(
      {
        id,
        nivelId: existente.nivelId,
        parentId: existente.parentId,
        nombre: existente.nombre,
        codigoInterno: existente.codigoInterno,
      },
      usuario,
      rol,
    );

    const deviceId = await getOrCreateDeviceId(this.db);
    const lamportClock = await getNextLamportClock(this.db);
    await this.repository.eliminarLogico(id, deviceId, lamportClock);

    await registrarOrganizacionSync(this.db, this.syncRepository, id, SyncOperacion.DELETE);
  }

  private async validarJerarquia(input: GuardarOrganizacionInput): Promise<void> {
    const nivelHijo = await this.repository.obtenerNivelPorId(input.nivelId);
    if (!nivelHijo) {
      throw new OrganizacionValidationError('Nivel organizacional inválido');
    }

    if (input.parentId === null) {
      if (nivelHijo.codigo !== 'diocesis') {
        throw new OrganizacionValidationError(
          'Solo una Diócesis puede ser nodo raíz sin padre',
        );
      }
      return;
    }

    const padre = await this.repository.obtenerPorId(input.parentId);
    if (!padre) {
      throw new OrganizacionNotFoundError(input.parentId);
    }

    const nivelPadre = await this.repository.obtenerNivelPorId(padre.nivelId);
    if (!nivelPadre) {
      throw new OrganizacionValidationError('Nivel del padre no encontrado');
    }

    if (nivelHijo.nivelOrden >= nivelPadre.nivelOrden) {
      throw new OrganizacionValidationError(
        `Un ${nivelHijo.nombre} no puede depender de un ${nivelPadre.nombre}`,
      );
    }

    if (nivelHijo.codigo === 'capilla' && nivelPadre.codigo !== 'parroquia') {
      throw new OrganizacionValidationError('Una capilla debe pertenecer directamente a una parroquia');
    }
  }

  private async validarAlcance(
    input: GuardarOrganizacionInput,
    usuario: Usuario,
    rol: Rol,
  ): Promise<void> {
    const alcance = resolverAlcanceOrganizaciones(usuario, rol);

    if (alcance.mode === 'full') {
      return;
    }

    if (!alcance.rootId) {
      throw new OrganizacionPermissionDeniedError();
    }

    const subarbol = await this.repository.obtenerSubarbol(alcance.rootId);
    const idsPermitidos = new Set(subarbol.map((org) => org.id));

    if (input.parentId && !idsPermitidos.has(input.parentId)) {
      throw new OrganizacionPermissionDeniedError();
    }

    if (input.id && !idsPermitidos.has(input.id)) {
      throw new OrganizacionPermissionDeniedError();
    }

    if (rol.codigo !== UserRoleCodigo.SUPER_ADMIN && input.nivelId === SeedIds.NIVELES.DIOCESIS) {
      throw new OrganizacionPermissionDeniedError();
    }
  }
}
