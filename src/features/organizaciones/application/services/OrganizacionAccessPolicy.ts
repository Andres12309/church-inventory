import type { PermissionService } from '@/features/auth/application/services/PermissionService';
import type { Rol } from '@/features/auth/domain/entities/Rol';
import type { Usuario } from '@/features/auth/domain/entities/Usuario';
import { ModuloCodigo } from '@/shared/infrastructure/database/schema';
import {
  puedeAdministrarOrganizacionesRol,
  resolverAlcanceJerarquico,
} from '@/shared/config/hierarchyAccess';

export function puedeAdministrarOrganizaciones(
  permissionService: PermissionService,
  rol: Rol,
): boolean {
  if (!permissionService.tieneAcceso(ModuloCodigo.ORGANIZACIONES)) {
    return false;
  }

  return puedeAdministrarOrganizacionesRol(rol.codigo);
}

export function resolverAlcanceOrganizaciones(
  usuario: Usuario,
  rol: Rol,
): { mode: 'full' | 'subtree' | 'single'; rootId: string | null } {
  return resolverAlcanceJerarquico(usuario, rol);
}
