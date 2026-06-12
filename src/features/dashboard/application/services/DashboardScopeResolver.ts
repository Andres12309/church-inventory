import type { Rol } from '@/features/auth/domain/entities/Rol';
import type { Usuario } from '@/features/auth/domain/entities/Usuario';
import type { IOrganizacionRepository } from '@/features/organizaciones/domain/repositories/IOrganizacionRepository';
import { SeedIds, UserRoleCodigo } from '@/shared/infrastructure/database/schema';

export type DashboardScope = {
  aggregateOrgId: string;
  scopeLabel: string;
  parroquiaId: string | null;
  puedeAccionesRapidas: boolean;
};

export async function resolverAlcanceDashboard(
  usuario: Usuario,
  rol: Rol,
  orgRepository: IOrganizacionRepository,
): Promise<DashboardScope> {
  const org = await orgRepository.obtenerPorId(usuario.organizacionId);
  const scopeLabel = org?.nombre ?? 'Sin alcance';

  const puedeAccionesRapidas =
    rol.codigo === UserRoleCodigo.SUPER_ADMIN ||
    rol.codigo === UserRoleCodigo.OBISPO ||
    rol.codigo === UserRoleCodigo.PARROCO;

  let parroquiaId: string | null = null;

  if (rol.codigo === UserRoleCodigo.PARROCO) {
    parroquiaId = usuario.organizacionId;
  } else if (
    rol.codigo === UserRoleCodigo.SUPER_ADMIN ||
    rol.codigo === UserRoleCodigo.OBISPO
  ) {
    const hijos = await orgRepository.listarHijosDirectos(usuario.organizacionId);
    const parroquia = hijos.find((hijo) => hijo.nivelId === SeedIds.NIVELES.PARROQUIA);
    parroquiaId = parroquia?.id ?? null;
  }

  return {
    aggregateOrgId: usuario.organizacionId,
    scopeLabel,
    parroquiaId,
    puedeAccionesRapidas,
  };
}
