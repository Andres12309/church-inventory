import type { FinanzaNaturalezaValue } from '../../domain/entities/FinanzaNaturaleza';

export type RegistrarRecaudacionInput = {
  id?: string;
  organizacionId: string;
  tipoActividadId: string;
  naturaleza: FinanzaNaturalezaValue;
  monto: number;
  fecha: string;
  descripcion?: string | null;
};
