import type { FinanzaNaturalezaValue } from './FinanzaNaturaleza';

export type TipoActividad = {
  readonly id: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly naturaleza: FinanzaNaturalezaValue;
  readonly activo: boolean;
  readonly syncVector: string;
  readonly updatedAt: string;
  readonly updatedByDevice: string;
};
