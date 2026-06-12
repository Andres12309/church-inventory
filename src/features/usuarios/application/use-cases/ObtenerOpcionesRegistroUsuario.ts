import type { PermissionService } from '@/features/auth/application/services/PermissionService';
import type { Rol } from '@/features/auth/domain/entities/Rol';
import type { Usuario } from '@/features/auth/domain/entities/Usuario';
import type { Organizacion } from '@/features/organizaciones/domain/entities/Organizacion';
import { resolverAlcanceOrganizaciones } from '@/features/organizaciones/application/services/OrganizacionAccessPolicy';
import type { IOrganizacionRepository } from '@/features/organizaciones/domain/repositories/IOrganizacionRepository';

import {
  filtrarOrganizacionesAsignables,
  puedeRegistrarUsuarios,
  resolverOrganizacionesEnAlcance,
  rolesAsignablesPorCreador,
} from '../services/UsuarioAccessPolicy';
import { UsuarioPermissionDeniedError } from '../../domain/errors/UsuarioLocalError';
import type { IUsuarioLocalRepository } from '../../domain/repositories/IUsuarioLocalRepository';

export type OpcionesRegistroUsuario = {
  roles: Rol[];
  organizacionesPorRol: Record<string, Organizacion[]>;
};

export class ObtenerOpcionesRegistroUsuario {
  constructor(
    private readonly usuarioRepository: IUsuarioLocalRepository,
    private readonly organizacionRepository: IOrganizacionRepository,
  ) {}

  async execute(
    creador: Usuario,
    rolCreador: Rol,
    permissionService: PermissionService,
  ): Promise<OpcionesRegistroUsuario> {
    if (!puedeRegistrarUsuarios(permissionService)) {
      throw new UsuarioPermissionDeniedError();
    }

    const codigosPermitidos = rolesAsignablesPorCreador(rolCreador);
    const roles = await this.usuarioRepository.listarRolesPorCodigos(codigosPermitidos);

    const alcance = resolverAlcanceOrganizaciones(creador, rolCreador);
    let organizaciones: Organizacion[];

    if (alcance.mode === 'full') {
      const raices = await this.organizacionRepository.listarHijosDirectos(null);
      const subarboles = await Promise.all(
        raices.map((raiz) => this.organizacionRepository.obtenerSubarbol(raiz.id)),
      );
      organizaciones = subarboles.flat();
    } else {
      organizaciones = await this.organizacionRepository.obtenerSubarbol(creador.organizacionId);
    }

    const enAlcance = resolverOrganizacionesEnAlcance(creador, rolCreador, organizaciones);

    const organizacionesPorRol: Record<string, Organizacion[]> = {};
    for (const rol of roles) {
      organizacionesPorRol[rol.id] = filtrarOrganizacionesAsignables(enAlcance, rol.codigo);
    }

    return { roles, organizacionesPorRol };
  }
}
