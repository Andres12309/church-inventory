export type Ofrenda = {
  readonly id: string;
  readonly organizacionId: string;
  readonly tipoActividadId: string;
  readonly monto: number;
  readonly fecha: string;
  readonly descripcion: string | null;
  readonly activo: boolean;
  readonly syncVector: string;
  readonly updatedAt: string;
  readonly updatedByDevice: string;
};
