import type { BienEstadoValue } from '@/shared/infrastructure/database/schema';

export type GestionarBienInput = {
  id?: string;
  organizacionId: string;
  categoriaId: string;
  nombre: string;
  descripcion?: string | null;
  estado: BienEstadoValue;
  cantidad: number;
  valorEstimado?: number | null;
  observaciones?: string | null;
  fotoUri?: string | null;
  nuevaFotoTempUri?: string | null;
  eliminarFoto?: boolean;
};
