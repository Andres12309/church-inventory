export const REPORTE_INTERCAMBIO_FORMATO = 'fieles-bienes/1' as const;

export type ReporteImportResumen = {
  insertados: number;
  actualizados: number;
  omitidos: number;
  fueraAlcance: number;
  errores: number;
};

export type ReporteImportAccion =
  | 'insertar'
  | 'actualizar'
  | 'omitir_local_reciente'
  | 'fuera_alcance'
  | 'error';

export type ReporteImportItemPreview = {
  readonly tipo: 'bien' | 'ofrenda';
  readonly accion: ReporteImportAccion;
  readonly titulo: string;
  readonly subtitulo: string;
  readonly detalle: string | null;
};

export type ReporteImportPreview = {
  readonly fileUri: string;
  readonly fileName: string;
  readonly bienes: ReporteImportResumen;
  readonly ofrendas: ReporteImportResumen;
  readonly origenAlcance: string | null;
  readonly origenGeneradoAt: string | null;
  readonly origenDispositivo: string | null;
  readonly mensajesError: readonly string[];
  readonly ejemplos: readonly ReporteImportItemPreview[];
  readonly totalAplicable: number;
  readonly puedeAplicar: boolean;
};

export type ReporteImportResult = {
  readonly bienes: ReporteImportResumen;
  readonly ofrendas: ReporteImportResumen;
  readonly origenAlcance: string | null;
  readonly origenGeneradoAt: string | null;
  readonly origenDispositivo: string | null;
  readonly mensajesError: readonly string[];
};

export function resumenImportacionTotal(result: ReporteImportResult | ReporteImportPreview): number {
  return (
    result.bienes.insertados +
    result.bienes.actualizados +
    result.ofrendas.insertados +
    result.ofrendas.actualizados
  );
}

export function etiquetaAccionImportacion(accion: ReporteImportAccion): string {
  const map: Record<ReporteImportAccion, string> = {
    insertar: 'Nuevo',
    actualizar: 'Actualizar',
    omitir_local_reciente: 'Omitir (local más reciente)',
    fuera_alcance: 'Fuera de alcance',
    error: 'Error',
  };
  return map[accion];
}
