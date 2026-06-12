import type { PermissionService } from '@/features/auth/application/services/PermissionService';
import type { Rol } from '@/features/auth/domain/entities/Rol';
import type { Usuario } from '@/features/auth/domain/entities/Usuario';
import type { IOrganizacionRepository } from '@/features/organizaciones/domain/repositories/IOrganizacionRepository';
import { ModuloCodigo, UserRoleCodigo } from '@/shared/infrastructure/database/schema';

import { BienPermissionDeniedError } from '../../domain/errors/BienPermissionDeniedError';
import { BienError } from '../../domain/errors/BienError';

export function tieneAccesoInventario(permissionService: PermissionService): boolean {
  return permissionService.tieneAcceso(ModuloCodigo.INVENTARIO_BIENES);
}

export async function validarAccesoOrganizacion(
  organizacionId: string,
  usuario: Usuario,
  rol: Rol,
  organizacionRepository: IOrganizacionRepository,
  mode: 'read' | 'write',
): Promise<void> {
  const organizacion = await organizacionRepository.obtenerPorId(organizacionId);
  if (!organizacion) {
    throw new BienError('La organización seleccionada no existe');
  }

  const nivel = await organizacionRepository.obtenerNivelPorId(organizacion.nivelId);
  if (!nivel?.esHoja) {
    throw new BienError('El inventario solo puede gestionarse en capillas');
  }

  if (rol.codigo === UserRoleCodigo.SUPER_ADMIN || rol.codigo === UserRoleCodigo.OBISPO) {
    if (rol.codigo === UserRoleCodigo.SUPER_ADMIN) {
      return;
    }
    const subarbol = await organizacionRepository.obtenerSubarbol(usuario.organizacionId);
    if (!subarbol.some((org) => org.id === organizacionId)) {
      throw new BienPermissionDeniedError();
    }
    return;
  }

  if (rol.codigo === UserRoleCodigo.ENCARGADO_CAPILLA) {
    if (organizacionId !== usuario.organizacionId) {
      throw new BienPermissionDeniedError();
    }
    return;
  }

  if (rol.codigo === UserRoleCodigo.PARROCO) {
    const subarbol = await organizacionRepository.obtenerSubarbol(usuario.organizacionId);
    const permitido = subarbol.some((org) => org.id === organizacionId);
    if (!permitido) {
      throw new BienPermissionDeniedError();
    }
    return;
  }

  if (mode === 'write') {
    throw new BienPermissionDeniedError();
  }

  throw new BienPermissionDeniedError();
}

export function resolverOrganizacionPorDefecto(
  usuario: Usuario,
  rol: Rol,
  orgIdParam?: string | null,
): string | null {
  if (rol.codigo === UserRoleCodigo.ENCARGADO_CAPILLA) {
    return usuario.organizacionId;
  }

  return orgIdParam ?? null;
}
