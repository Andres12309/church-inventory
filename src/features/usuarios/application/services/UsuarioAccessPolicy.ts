import type { PermissionService } from '@/features/auth/application/services/PermissionService';
import type { Rol } from '@/features/auth/domain/entities/Rol';
import type { Usuario } from '@/features/auth/domain/entities/Usuario';
import { resolverAlcanceOrganizaciones } from '@/features/organizaciones/application/services/OrganizacionAccessPolicy';
import type { Organizacion } from '@/features/organizaciones/domain/entities/Organizacion';
import {
  nivelOrganizacionIdParaRol as nivelOrgIdPorRol,
  rolesAsignablesPorCreador as rolesAsignablesCodigo,
} from '@/shared/config/hierarchyAccess';
import { ModuloCodigo, type UserRoleCodigoValue } from '@/shared/infrastructure/database/schema';

const PIN_LENGTH = 4;

export function puedeRegistrarUsuarios(permissionService: PermissionService): boolean {
  return permissionService.tieneAcceso(ModuloCodigo.USUARIOS);
}

export function rolesAsignablesPorCreador(rolCreador: Rol): UserRoleCodigoValue[] {
  return rolesAsignablesCodigo(rolCreador.codigo);
}

export function nivelOrganizacionIdParaRol(roleCodigo: UserRoleCodigoValue): string {
  return nivelOrgIdPorRol(roleCodigo);
}

export function filtrarOrganizacionesAsignables(
  organizaciones: Organizacion[],
  roleCodigo: UserRoleCodigoValue,
): Organizacion[] {
  const nivelId = nivelOrganizacionIdParaRol(roleCodigo);
  return organizaciones.filter((org) => org.nivelId === nivelId && org.activo);
}

export function resolverOrganizacionesEnAlcance(
  usuario: Usuario,
  rol: Rol,
  organizaciones: Organizacion[],
): Organizacion[] {
  const alcance = resolverAlcanceOrganizaciones(usuario, rol);

  if (alcance.mode === 'full') {
    return organizaciones;
  }

  if (!alcance.rootId) {
    return [];
  }

  const rootIndex = organizaciones.findIndex((org) => org.id === alcance.rootId);
  if (rootIndex < 0) {
    return [];
  }

  const idsEnSubarbol = new Set<string>();
  const queue = [alcance.rootId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId || idsEnSubarbol.has(currentId)) {
      continue;
    }

    idsEnSubarbol.add(currentId);
    const hijos = organizaciones.filter((org) => org.parentId === currentId);
    queue.push(...hijos.map((hijo) => hijo.id));
  }

  return organizaciones.filter((org) => idsEnSubarbol.has(org.id));
}

export function validarPinLocal(pin: string, pinConfirmacion: string): string | null {
  if (!/^\d{4}$/.test(pin)) {
    return 'El PIN debe tener exactamente 4 dígitos numéricos';
  }

  if (pin !== pinConfirmacion) {
    return 'La confirmación del PIN no coincide';
  }

  return null;
}

export const USUARIO_LOCAL_PIN_LENGTH = PIN_LENGTH;
