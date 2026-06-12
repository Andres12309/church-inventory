import type { PermissionService } from '@/features/auth/application/services/PermissionService';
import type { Rol } from '@/features/auth/domain/entities/Rol';
import type { Usuario } from '@/features/auth/domain/entities/Usuario';
import { resolverAlcanceOrganizaciones } from '@/features/organizaciones/application/services/OrganizacionAccessPolicy';
import type { IOrganizacionRepository } from '@/features/organizaciones/domain/repositories/IOrganizacionRepository';

import type { UsuarioListadoItem } from '../../domain/entities/UsuarioListadoItem';
import { UsuarioPermissionDeniedError } from '../../domain/errors/UsuarioLocalError';
import type { IUsuarioLocalRepository } from '../../domain/repositories/IUsuarioLocalRepository';
import { puedeRegistrarUsuarios, resolverOrganizacionesEnAlcance } from '../services/UsuarioAccessPolicy';

export class ListarUsuariosEnAlcance {
  constructor(
    private readonly usuarioRepository: IUsuarioLocalRepository,
    private readonly organizacionRepository: IOrganizacionRepository,
  ) {}

  async execute(
    solicitante: Usuario,
    rolSolicitante: Rol,
    permissionService: PermissionService,
  ): Promise<UsuarioListadoItem[]> {
    if (!puedeRegistrarUsuarios(permissionService)) {
      throw new UsuarioPermissionDeniedError();
    }

    const alcance = resolverAlcanceOrganizaciones(solicitante, rolSolicitante);
    let organizacionIds: string[];

    if (alcance.mode === 'full') {
      const raices = await this.organizacionRepository.listarHijosDirectos(null);
      const subarboles = await Promise.all(
        raices.map((raiz) => this.organizacionRepository.obtenerSubarbol(raiz.id)),
      );
      organizacionIds = subarboles.flat().map((org) => org.id);
    } else {
      const subarbol = await this.organizacionRepository.obtenerSubarbol(solicitante.organizacionId);
      const enAlcance = resolverOrganizacionesEnAlcance(solicitante, rolSolicitante, subarbol);
      organizacionIds = enAlcance.map((org) => org.id);
    }

    return this.usuarioRepository.listarEnOrganizaciones(organizacionIds);
  }
}
