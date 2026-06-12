import type { PermissionService } from '@/features/auth/application/services/PermissionService';
import type { Rol } from '@/features/auth/domain/entities/Rol';
import type { Usuario } from '@/features/auth/domain/entities/Usuario';
import type { IOrganizacionRepository } from '@/features/organizaciones/domain/repositories/IOrganizacionRepository';
import { ModuloCodigo, UserRoleCodigo } from '@/shared/infrastructure/database/schema';

import { OfrendaError } from '../../domain/errors/OfrendaError';
import { OfrendaPermissionDeniedError } from '../../domain/errors/OfrendaPermissionDeniedError';

export function tieneAccesoOfrendas(permissionService: PermissionService): boolean {
  return permissionService.tieneAcceso(ModuloCodigo.OFRENDAS);
}

export async function validarAccesoOrganizacion(
  organizacionId: string,
  usuario: Usuario,
  rol: Rol,
  organizacionRepository: IOrganizacionRepository,
): Promise<void> {
  const organizacion = await organizacionRepository.obtenerPorId(organizacionId);
  if (!organizacion) {
    throw new OfrendaError('La organización seleccionada no existe');
  }

  const nivel = await organizacionRepository.obtenerNivelPorId(organizacion.nivelId);
  if (!nivel) {
    throw new OfrendaError('Nivel organizacional inválido');
  }

  if (rol.codigo === UserRoleCodigo.SUPER_ADMIN || rol.codigo === UserRoleCodigo.OBISPO) {
    if (rol.codigo === UserRoleCodigo.SUPER_ADMIN) {
      return;
    }
    const subarbol = await organizacionRepository.obtenerSubarbol(usuario.organizacionId);
    if (!subarbol.some((org) => org.id === organizacionId)) {
      throw new OfrendaPermissionDeniedError();
    }
    return;
  }

  if (rol.codigo === UserRoleCodigo.ENCARGADO_CAPILLA) {
    if (organizacionId !== usuario.organizacionId) {
      throw new OfrendaPermissionDeniedError();
    }
    if (!nivel.esHoja) {
      throw new OfrendaError('Solo puedes registrar ofrendas en tu capilla asignada');
    }
    return;
  }

  if (rol.codigo === UserRoleCodigo.PARROCO) {
    const subarbol = await organizacionRepository.obtenerSubarbol(usuario.organizacionId);
    const permitido = subarbol.some((org) => org.id === organizacionId);
    if (!permitido) {
      throw new OfrendaPermissionDeniedError();
    }
    return;
  }

  throw new OfrendaPermissionDeniedError();
}

export function resolverOrganizacionPorDefecto(
  usuario: Usuario,
  rol: Rol,
  orgIdParam?: string | null,
  orgIdsGestionables?: readonly string[],
): string | null {
  if (rol.codigo === UserRoleCodigo.ENCARGADO_CAPILLA) {
    return usuario.organizacionId;
  }

  if (orgIdParam) {
    return orgIdParam;
  }

  if (orgIdsGestionables?.length === 1) {
    return orgIdsGestionables[0];
  }

  return null;
}

export function obtenerFechaHoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function obtenerInicioMesIso(fechaReferencia = new Date()): string {
  const year = fechaReferencia.getFullYear();
  const month = String(fechaReferencia.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}
