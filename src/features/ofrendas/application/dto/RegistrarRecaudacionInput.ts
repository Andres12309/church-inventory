export type RegistrarRecaudacionInput = {
  id?: string;
  organizacionId: string;
  tipoActividadId: string;
  monto: number;
  fecha: string;
  descripcion?: string | null;
};
