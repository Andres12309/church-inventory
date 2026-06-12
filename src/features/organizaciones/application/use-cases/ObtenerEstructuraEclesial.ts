import type { PermissionService } from '@/features/auth/application/services/PermissionService';
import type { Rol } from '@/features/auth/domain/entities/Rol';
import type { Usuario } from '@/features/auth/domain/entities/Usuario';
import { ModuloCodigo } from '@/shared/infrastructure/database/schema';

import type { Organizacion } from '../../domain/entities/Organizacion';
import type { Ubicacion } from '../../domain/entities/Ubicacion';
import type { IOrganizacionRepository } from '../../domain/repositories/IOrganizacionRepository';
import type { EstructuraEclesial, OrganizacionNodo } from '../dto/EstructuraEclesial';
import {
  puedeAdministrarOrganizaciones,
  resolverAlcanceOrganizaciones,
} from '../services/OrganizacionAccessPolicy';
import { buildOrganizacionTree } from '../services/OrganizacionTreeBuilder';

export class ObtenerEstructuraEclesial {
  constructor(private readonly repository: IOrganizacionRepository) {}

  async execute(
    usuario: Usuario,
    rol: Rol,
    permissionService: PermissionService,
  ): Promise<EstructuraEclesial> {
    if (!permissionService.tieneAcceso(ModuloCodigo.ORGANIZACIONES)) {
      return { nodos: [], niveles: [], puedeAdministrar: false, alcanceRootId: null };
    }

    const niveles = await this.repository.listarNiveles();
    const nivelesPorId = new Map(niveles.map((nivel) => [nivel.id, nivel]));
    const alcance = resolverAlcanceOrganizaciones(usuario, rol);
    const puedeAdministrar = puedeAdministrarOrganizaciones(permissionService, rol);

    let organizaciones: Organizacion[] = [];
    let nodos: OrganizacionNodo[] = [];

    if (alcance.mode === 'full') {
      const raices = await this.repository.listarHijosDirectos(null);
      const subarboles = await Promise.all(
        raices.map((raiz) => this.repository.obtenerSubarbol(raiz.id)),
      );
      organizaciones = subarboles.flat();
    } else if (alcance.mode === 'subtree' && alcance.rootId) {
      organizaciones = await this.repository.obtenerSubarbol(alcance.rootId);
    } else if (alcance.rootId) {
      const org = await this.repository.obtenerPorId(alcance.rootId);
      organizaciones = org ? [org] : [];
    }

    const ubicacionesEntries = await Promise.all(
      organizaciones.map(async (org) => {
        const ubicacion = await this.repository.obtenerUbicacion(org.id);
        return ubicacion ? ([org.id, ubicacion] as const) : null;
      }),
    );

    const ubicacionesPorOrgId = new Map<string, Ubicacion>(
      ubicacionesEntries.filter((entry): entry is [string, Ubicacion] => entry != null),
    );

    if (alcance.mode === 'single' && organizaciones[0]) {
      const org = organizaciones[0];
      const nivel = nivelesPorId.get(org.nivelId);
      if (nivel) {
        nodos = [
          {
            organizacion: org,
            nivel,
            ubicacion: ubicacionesPorOrgId.get(org.id) ?? null,
            hijos: [],
          },
        ];
      }
    } else if (alcance.mode === 'subtree' && alcance.rootId) {
      const rootOrg = organizaciones.find((org) => org.id === alcance.rootId);
      const rootNivel = rootOrg ? nivelesPorId.get(rootOrg.nivelId) : undefined;

      if (rootOrg && rootNivel) {
        nodos = [
          {
            organizacion: rootOrg,
            nivel: rootNivel,
            ubicacion: ubicacionesPorOrgId.get(rootOrg.id) ?? null,
            hijos: buildOrganizacionTree(
              organizaciones,
              nivelesPorId,
              ubicacionesPorOrgId,
              rootOrg.id,
            ),
          },
        ];
      }
    } else {
      const parentIdForTree = alcance.mode === 'full' ? null : null;

      nodos = buildOrganizacionTree(
        organizaciones,
        nivelesPorId,
        ubicacionesPorOrgId,
        parentIdForTree,
      );
    }

    return {
      nodos,
      niveles,
      puedeAdministrar,
      alcanceRootId: alcance.rootId,
    };
  }
}
