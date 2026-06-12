import type { ModuloCodigoValue } from '@/shared/infrastructure/database/schema';

export type Modulo = {
  readonly id: string;
  readonly codigo: ModuloCodigoValue;
  readonly nombre: string;
  readonly ruta: string;
  readonly orden: number;
  readonly activo: boolean;
};
