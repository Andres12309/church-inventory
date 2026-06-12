import type { PermissionService } from '@/features/auth/application/services/PermissionService';
import type { Rol } from '@/features/auth/domain/entities/Rol';
import type { Usuario } from '@/features/auth/domain/entities/Usuario';
import type { IOrganizacionRepository } from '@/features/organizaciones/domain/repositories/IOrganizacionRepository';

import type { Bien } from '../../domain/entities/Bien';
import type { CategoriaBien } from '../../domain/entities/CategoriaBien';
import { BienError } from '../../domain/errors/BienError';
import type { BienFiltros, IBienRepository } from '../../domain/repositories/IBienRepository';
import { tieneAccesoInventario, validarAccesoOrganizacion } from '../services/BienAccessPolicy';

export class ConsultarInventario {
  constructor(
    private readonly bienRepository: IBienRepository,
    private readonly organizacionRepository: IOrganizacionRepository,
  ) {}

  async listarBienes(
    organizacionId: string,
    usuario: Usuario,
    rol: Rol,
    permissionService: PermissionService,
    filtros?: BienFiltros,
  ): Promise<Bien[]> {
    if (!tieneAccesoInventario(permissionService)) {
      throw new BienError('Sin acceso al módulo de inventario');
    }

    await validarAccesoOrganizacion(
      organizacionId,
      usuario,
      rol,
      this.organizacionRepository,
      'read',
    );

    return this.bienRepository.listarPorOrganizacion(organizacionId, filtros);
  }

  async obtenerBien(
    id: string,
    usuario: Usuario,
    rol: Rol,
    permissionService: PermissionService,
  ): Promise<Bien> {
    if (!tieneAccesoInventario(permissionService)) {
      throw new BienError('Sin acceso al módulo de inventario');
    }

    const bien = await this.bienRepository.obtenerPorId(id);
    if (!bien) {
      throw new BienError('Bien no encontrado');
    }

    await validarAccesoOrganizacion(
      bien.organizacionId,
      usuario,
      rol,
      this.organizacionRepository,
      'read',
    );

    return bien;
  }

  async listarCategorias(permissionService: PermissionService): Promise<CategoriaBien[]> {
    if (!tieneAccesoInventario(permissionService)) {
      throw new BienError('Sin acceso al módulo de inventario');
    }

    return this.bienRepository.listarCategorias();
  }
}
