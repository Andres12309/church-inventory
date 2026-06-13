import { UserRoleCodigo, type UserRoleCodigoValue } from '@/shared/infrastructure/database/schema';

import type { Rol } from '@/features/auth/domain/entities/Rol';

export function puedeConfigurarPaqueteSync(rol: Rol): boolean {
  const allowed: UserRoleCodigoValue[] = [
    UserRoleCodigo.SUPER_ADMIN,
    UserRoleCodigo.OBISPO,
    UserRoleCodigo.PARROCO,
  ];
  return allowed.includes(rol.codigo);
}
