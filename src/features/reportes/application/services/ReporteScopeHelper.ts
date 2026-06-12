import type { Rol } from '@/features/auth/domain/entities/Rol';
import type { Usuario } from '@/features/auth/domain/entities/Usuario';
import type { IOrganizacionRepository } from '@/features/organizaciones/domain/repositories/IOrganizacionRepository';
import { resolverAlcanceOrganizaciones } from '@/features/organizaciones/application/services/OrganizacionAccessPolicy';

export type ReporteAlcance = {
  readonly orgIds: string[];
  readonly orgIdSet: ReadonlySet<string>;
  readonly orgCodigoToId: ReadonlyMap<string, string>;
  readonly scopeOrgId: string;
  readonly scopeOrgNombre: string;
  readonly scopeOrgCodigo: string;
};

export async function resolverAlcanceReporte(
  organizacionRepository: IOrganizacionRepository,
  usuario: Usuario,
  rol: Rol,
): Promise<ReporteAlcance> {
  const alcance = resolverAlcanceOrganizaciones(usuario, rol);
  let organizaciones: Awaited<ReturnType<IOrganizacionRepository['obtenerSubarbol']>>;

  if (alcance.mode === 'full') {
    const raices = await organizacionRepository.listarHijosDirectos(null);
    const subarboles = await Promise.all(
      raices.map((raiz) => organizacionRepository.obtenerSubarbol(raiz.id)),
    );
    organizaciones = subarboles.flat();
  } else {
    organizaciones = await organizacionRepository.obtenerSubarbol(usuario.organizacionId);
  }

  const orgIds = organizaciones.map((org) => org.id);
  const orgCodigoToId = new Map(organizaciones.map((org) => [org.codigoInterno, org.id]));

  const scopeOrgId = alcance.rootId ?? usuario.organizacionId;
  const scopeOrg = await organizacionRepository.obtenerPorId(scopeOrgId);

  return {
    orgIds,
    orgIdSet: new Set(orgIds),
    orgCodigoToId,
    scopeOrgId,
    scopeOrgNombre: scopeOrg?.nombre ?? 'Alcance general',
    scopeOrgCodigo: scopeOrg?.codigoInterno ?? '—',
  };
}
