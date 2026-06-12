import type { PermissionService } from '@/features/auth/application/services/PermissionService';
import type { Rol } from '@/features/auth/domain/entities/Rol';
import type { Usuario } from '@/features/auth/domain/entities/Usuario';
import type { IOrganizacionRepository } from '@/features/organizaciones/domain/repositories/IOrganizacionRepository';

import type { Ofrenda } from '../../domain/entities/Ofrenda';
import type { TipoActividad } from '../../domain/entities/TipoActividad';
import { OfrendaError } from '../../domain/errors/OfrendaError';
import type { IOfrendaRepository, OfrendaFiltros } from '../../domain/repositories/IOfrendaRepository';
import { tieneAccesoOfrendas, validarAccesoOrganizacion } from '../services/OfrendaAccessPolicy';

export class ConsultarFinanzas {
  constructor(
    private readonly ofrendaRepository: IOfrendaRepository,
    private readonly organizacionRepository: IOrganizacionRepository,
  ) {}

  async listarRecaudaciones(
    organizacionId: string,
    usuario: Usuario,
    rol: Rol,
    permissionService: PermissionService,
    filtros?: OfrendaFiltros,
  ): Promise<Ofrenda[]> {
    if (!tieneAccesoOfrendas(permissionService)) {
      throw new OfrendaError('Sin acceso al módulo de ofrendas');
    }

    await validarAccesoOrganizacion(
      organizacionId,
      usuario,
      rol,
      this.organizacionRepository,
    );

    return this.ofrendaRepository.listarPorOrganizacion(organizacionId, filtros);
  }

  async obtenerRecaudacion(
    id: string,
    usuario: Usuario,
    rol: Rol,
    permissionService: PermissionService,
  ): Promise<Ofrenda> {
    if (!tieneAccesoOfrendas(permissionService)) {
      throw new OfrendaError('Sin acceso al módulo de ofrendas');
    }

    const ofrenda = await this.ofrendaRepository.obtenerPorId(id);
    if (!ofrenda) {
      throw new OfrendaError('Recaudación no encontrada');
    }

    await validarAccesoOrganizacion(
      ofrenda.organizacionId,
      usuario,
      rol,
      this.organizacionRepository,
    );

    return ofrenda;
  }

  async listarTiposActividad(permissionService: PermissionService): Promise<TipoActividad[]> {
    if (!tieneAccesoOfrendas(permissionService)) {
      throw new OfrendaError('Sin acceso al módulo de ofrendas');
    }

    return this.ofrendaRepository.listarTiposActividad();
  }
}
