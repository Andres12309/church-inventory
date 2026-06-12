import type { BienEstadoValue } from '@/shared/infrastructure/database/schema';

export type Bien = {
  readonly id: string;
  readonly organizacionId: string;
  readonly categoriaId: string;
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly estado: BienEstadoValue;
  readonly cantidad: number;
  readonly valorEstimado: number | null;
  readonly fotoUri: string | null;
  readonly observaciones: string | null;
  readonly activo: boolean;
  readonly syncVector: string;
  readonly updatedAt: string;
  readonly updatedByDevice: string;
};
