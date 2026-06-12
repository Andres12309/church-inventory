import type { Rol } from '@/features/auth/domain/entities/Rol';
import type { Usuario } from '@/features/auth/domain/entities/Usuario';
import { SeedIds, UserRoleCodigo, type UserRoleCodigoValue } from '@/shared/infrastructure/database/schema';

import { HIERARCHY_V1, type HierarchyScope, type NivelOrganizacionCodigo } from './hierarchy';

export function obtenerScopeRol(roleCodigo: UserRoleCodigoValue): HierarchyScope {
  const rol = HIERARCHY_V1.roles.find((r) => r.codigo === roleCodigo);
  return rol?.scope ?? 'single';
}

export function puedeAdministrarOrganizacionesRol(roleCodigo: UserRoleCodigoValue): boolean {
  return (
    roleCodigo === UserRoleCodigo.SUPER_ADMIN ||
    roleCodigo === UserRoleCodigo.OBISPO ||
    roleCodigo === UserRoleCodigo.PARROCO
  );
}

export function puedeElegirOrganizacionEnCrud(roleCodigo: UserRoleCodigoValue): boolean {
  return (
    roleCodigo === UserRoleCodigo.SUPER_ADMIN ||
    roleCodigo === UserRoleCodigo.OBISPO ||
    roleCodigo === UserRoleCodigo.PARROCO
  );
}

export function resolverAlcanceJerarquico(
  usuario: Usuario,
  rol: Rol,
): { mode: HierarchyScope; rootId: string | null } {
  const scope = obtenerScopeRol(rol.codigo);

  if (scope === 'full') {
    return { mode: 'full', rootId: null };
  }

  if (scope === 'subtree') {
    return { mode: 'subtree', rootId: usuario.organizacionId };
  }

  return { mode: 'single', rootId: usuario.organizacionId };
}

export function rolesAsignablesPorCreador(roleCodigo: UserRoleCodigoValue): UserRoleCodigoValue[] {
  const regla = HIERARCHY_V1.rolesAsignables.find((r) => r.creador === roleCodigo);
  return [...(regla?.puedeCrear ?? [])];
}

export function nivelesCreablesPorRol(roleCodigo: UserRoleCodigoValue): NivelOrganizacionCodigo[] {
  const rol = HIERARCHY_V1.roles.find((r) => r.codigo === roleCodigo);
  return [...(rol?.creaOrganizacionNiveles ?? [])];
}

export function puedeCrearNivelOrganizacion(
  roleCodigo: UserRoleCodigoValue,
  nivelCodigo: NivelOrganizacionCodigo,
): boolean {
  return nivelesCreablesPorRol(roleCodigo).includes(nivelCodigo);
}

export function nivelOrganizacionIdParaCodigo(nivelCodigo: NivelOrganizacionCodigo): string {
  const map: Record<NivelOrganizacionCodigo, string> = {
    diocesis: SeedIds.NIVELES.DIOCESIS,
    parroquia: SeedIds.NIVELES.PARROQUIA,
    capilla: SeedIds.NIVELES.CAPILLA,
  };
  return map[nivelCodigo];
}

export function nivelOrganizacionIdParaRol(roleCodigo: UserRoleCodigoValue): string {
  const rol = HIERARCHY_V1.roles.find((r) => r.codigo === roleCodigo);
  if (rol?.orgAsignacionNivel) {
    return nivelOrganizacionIdParaCodigo(rol.orgAsignacionNivel);
  }
  return SeedIds.NIVELES.CAPILLA;
}

export function etiquetaJerarquiaRol(roleCodigo: UserRoleCodigoValue): string {
  const map: Record<string, string> = {
    [UserRoleCodigo.SUPER_ADMIN]: 'Sistema',
    [UserRoleCodigo.OBISPO]: 'Catedral',
    [UserRoleCodigo.PARROCO]: 'Parroquia',
    [UserRoleCodigo.ENCARGADO_CAPILLA]: 'Capilla',
  };
  return map[roleCodigo] ?? 'Organización';
}

export function etiquetaNivelOrganizacion(nivelCodigo: NivelOrganizacionCodigo): string {
  const map: Record<NivelOrganizacionCodigo, string> = {
    diocesis: 'Catedral',
    parroquia: 'Parroquia',
    capilla: 'Capilla',
  };
  return map[nivelCodigo] ?? nivelCodigo;
}

export function parentNivelRequerido(nivelCodigo: NivelOrganizacionCodigo): NivelOrganizacionCodigo | null {
  if (nivelCodigo === 'parroquia') {
    return 'diocesis';
  }
  if (nivelCodigo === 'capilla') {
    return 'parroquia';
  }
  return null;
}
