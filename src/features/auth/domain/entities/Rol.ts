import type { UserRoleCodigoValue } from '@/shared/infrastructure/database/schema';

export type Rol = {
  readonly id: string;
  readonly codigo: UserRoleCodigoValue;
  readonly nombre: string;
  readonly nivelMinimoOrden: number | null;
  readonly activo: boolean;
};
