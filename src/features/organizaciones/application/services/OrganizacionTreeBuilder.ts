import type { Organizacion } from '../../domain/entities/Organizacion';
import type { OrganizacionNivel } from '../../domain/entities/OrganizacionNivel';
import type { Ubicacion } from '../../domain/entities/Ubicacion';
import type { OrganizacionNodo } from '../dto/EstructuraEclesial';

export function buildOrganizacionTree(
  organizaciones: Organizacion[],
  nivelesPorId: Map<string, OrganizacionNivel>,
  ubicacionesPorOrgId: Map<string, Ubicacion>,
  parentId: string | null,
): OrganizacionNodo[] {
  return organizaciones
    .filter((org) => org.parentId === parentId)
    .map((org) => {
      const nivel = nivelesPorId.get(org.nivelId);
      if (!nivel) {
        throw new Error(`Nivel no encontrado para organización ${org.id}`);
      }

      return {
        organizacion: org,
        nivel,
        ubicacion: ubicacionesPorOrgId.get(org.id) ?? null,
        hijos: buildOrganizacionTree(organizaciones, nivelesPorId, ubicacionesPorOrgId, org.id),
      };
    });
}

export function flattenOrganizacionTree(nodos: OrganizacionNodo[]): OrganizacionNodo[] {
  const result: OrganizacionNodo[] = [];

  for (const nodo of nodos) {
    result.push(nodo);
    result.push(...flattenOrganizacionTree(nodo.hijos));
  }

  return result;
}
