import type { Rol } from '@/features/auth/domain/entities/Rol';
import type { Usuario } from '@/features/auth/domain/entities/Usuario';
import type { IOrganizacionRepository } from '@/features/organizaciones/domain/repositories/IOrganizacionRepository';
import { resolverAlcanceOrganizaciones } from '@/features/organizaciones/application/services/OrganizacionAccessPolicy';
import { UserRoleCodigo } from '@/shared/infrastructure/database/schema';

export async function resolverOrgScopeSync(
  usuario: Usuario,
  rol: Rol,
  organizacionRepository: IOrganizacionRepository,
): Promise<string[]> {
  const alcance = resolverAlcanceOrganizaciones(usuario, rol);

  if (alcance.mode === 'full') {
    const todas = await organizacionRepository.listarHijosDirectos(null);
    const diocesis = todas.length > 0 ? todas : [];
    const ids: string[] = [];

    for (const root of diocesis) {
      const subtree = await organizacionRepository.obtenerSubarbol(root.id);
      ids.push(...subtree.map((org) => org.id));
    }

    if (ids.length === 0) {
      const org = await organizacionRepository.obtenerPorId(usuario.organizacionId);
      return org ? [org.id] : [usuario.organizacionId];
    }

    return ids;
  }

  if (!alcance.rootId) {
    return [usuario.organizacionId];
  }

  const subarbol = await organizacionRepository.obtenerSubarbol(alcance.rootId);
  const ids = subarbol.map((org) => org.id);

  if (rol.codigo === UserRoleCodigo.ENCARGADO_CAPILLA) {
    return [usuario.organizacionId];
  }

  return ids.length > 0 ? ids : [usuario.organizacionId];
}
