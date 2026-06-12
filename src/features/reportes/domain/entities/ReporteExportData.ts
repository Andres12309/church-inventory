export type OrgExportRow = {
  readonly id: string;
  readonly codigoInterno: string;
  readonly nombre: string;
  readonly nivelNombre: string;
  readonly nivelOrden: number;
  readonly parentCodigo: string | null;
  readonly parentNombre: string | null;
  readonly activo: boolean;
  readonly ciudad: string | null;
  readonly provincia: string | null;
};

export type BienExportRow = {
  readonly id: string;
  readonly organizacionId: string;
  readonly categoriaId: string;
  readonly orgCodigo: string;
  readonly orgNombre: string;
  readonly categoria: string;
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly estado: string;
  readonly cantidad: number;
  readonly valorEstimado: number;
  readonly valorTotal: number;
  readonly observaciones: string | null;
  readonly updatedAt: string;
};

export type OfrendaExportRow = {
  readonly id: string;
  readonly organizacionId: string;
  readonly tipoActividadId: string;
  readonly orgCodigo: string;
  readonly orgNombre: string;
  readonly tipoActividad: string;
  readonly monto: number;
  readonly fecha: string;
  readonly descripcion: string | null;
  readonly updatedAt: string;
};

export type ResumenOrgRow = {
  readonly orgCodigo: string;
  readonly orgNombre: string;
  readonly nivel: string;
  readonly totalBienes: number;
  readonly bienesExcelente: number;
  readonly bienesBueno: number;
  readonly bienesRegular: number;
  readonly bienesMalo: number;
  readonly valorInventarioEstimado: number;
  readonly totalOfrendas: number;
  readonly ofrendasPorTipo: Readonly<Record<string, number>>;
  readonly calculadoAt: string | null;
};

export type ReporteExportData = {
  readonly organizaciones: OrgExportRow[];
  readonly bienes: BienExportRow[];
  readonly ofrendas: OfrendaExportRow[];
  readonly resumen: ResumenOrgRow[];
  readonly tiposActividad: readonly string[];
};
