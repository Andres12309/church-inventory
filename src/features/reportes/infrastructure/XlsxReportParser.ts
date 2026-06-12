import * as XLSX from 'xlsx';

import { BienEstado, type BienEstadoValue } from '@/shared/infrastructure/database/schema';

import { REPORTE_INTERCAMBIO_FORMATO } from '../domain/entities/ReporteImportResult';

export type ParsedReporteMetadatos = {
  readonly aplicacion: string | null;
  readonly formatoIntercambio: string | null;
  readonly generadoAtIso: string | null;
  readonly alcance: string | null;
  readonly dispositivo: string | null;
};

export type ParsedBienImportRow = {
  readonly id: string;
  readonly organizacionId: string | null;
  readonly orgCodigo: string | null;
  readonly categoriaId: string | null;
  readonly categoriaNombre: string | null;
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly estado: BienEstadoValue;
  readonly cantidad: number;
  readonly valorEstimado: number | null;
  readonly observaciones: string | null;
  readonly updatedAt: string;
};

export type ParsedOfrendaImportRow = {
  readonly id: string;
  readonly organizacionId: string | null;
  readonly orgCodigo: string | null;
  readonly tipoActividadId: string | null;
  readonly tipoActividadNombre: string | null;
  readonly monto: number;
  readonly fecha: string;
  readonly descripcion: string | null;
  readonly updatedAt: string;
};

export type ParsedTipoActividadImportRow = {
  readonly id: string;
  readonly codigo: string | null;
  readonly nombre: string;
  readonly activo: boolean;
  readonly updatedAt: string;
};

export type ParsedReporteImport = {
  readonly metadatos: ParsedReporteMetadatos;
  readonly bienes: ParsedBienImportRow[];
  readonly ofrendas: ParsedOfrendaImportRow[];
  readonly tiposActividad: ParsedTipoActividadImportRow[];
};

const ESTADO_FROM_LABEL: Record<string, BienEstadoValue> = {
  Excelente: BienEstado.EXCELENTE,
  Bueno: BienEstado.BUENO,
  Regular: BienEstado.REGULAR,
  Malo: BienEstado.MALO,
  excelente: BienEstado.EXCELENTE,
  bueno: BienEstado.BUENO,
  regular: BienEstado.REGULAR,
  malo: BienEstado.MALO,
};

function sheetToRows(sheet: XLSX.WorkSheet | undefined): Record<string, unknown>[] {
  if (!sheet) {
    return [];
  }
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
}

function asString(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseMetadatos(rows: Record<string, unknown>[]): ParsedReporteMetadatos {
  const map = new Map<string, string>();
  for (const row of rows) {
    const campo = asString(row.Campo);
    const valor = asString(row.Valor);
    if (campo && valor) {
      map.set(campo.toLowerCase(), valor);
    }
  }

  return {
    aplicacion: map.get('aplicación') ?? map.get('aplicacion') ?? null,
    formatoIntercambio: map.get('formato intercambio') ?? null,
    generadoAtIso: map.get('generado_at_iso') ?? map.get('generado el') ?? null,
    alcance: map.get('alcance') ?? null,
    dispositivo: map.get('dispositivo') ?? null,
  };
}

function parseEstado(value: unknown): BienEstadoValue {
  const text = asString(value);
  if (!text) {
    return BienEstado.BUENO;
  }
  return ESTADO_FROM_LABEL[text] ?? (text as BienEstadoValue);
}

function parseUpdatedAt(row: Record<string, unknown>): string {
  return (
    asString(row.updated_at_iso) ??
    asString(row['Última actualización']) ??
    new Date().toISOString()
  );
}

function parseBienes(rows: Record<string, unknown>[]): ParsedBienImportRow[] {
  const parsed: ParsedBienImportRow[] = [];

  for (const row of rows) {
    const id = asString(row.ID);
    const nombre = asString(row.Nombre);
    if (!id || !nombre) {
      continue;
    }

    const cantidad = asNumber(row.Cantidad) ?? 1;
    parsed.push({
      id,
      organizacionId: asString(row.id_organizacion),
      orgCodigo: asString(row['Código org.']),
      categoriaId: asString(row.id_categoria),
      categoriaNombre: asString(row.Categoría),
      nombre,
      descripcion: asString(row.Descripción),
      estado: parseEstado(row.Estado),
      cantidad: Math.max(1, Math.round(cantidad)),
      valorEstimado: asNumber(row['Valor unitario (USD)']),
      observaciones: asString(row.Observaciones),
      updatedAt: parseUpdatedAt(row),
    });
  }

  return parsed;
}

function parseOfrendas(rows: Record<string, unknown>[]): ParsedOfrendaImportRow[] {
  const parsed: ParsedOfrendaImportRow[] = [];

  for (const row of rows) {
    const id = asString(row.ID);
    const fecha = asString(row.Fecha);
    const monto = asNumber(row['Monto (USD)']);
    if (!id || !fecha || monto == null) {
      continue;
    }

    parsed.push({
      id,
      organizacionId: asString(row.id_organizacion),
      orgCodigo: asString(row['Código org.']),
      tipoActividadId: asString(row.id_tipo_actividad),
      tipoActividadNombre: asString(row['Tipo actividad']),
      monto,
      fecha,
      descripcion: asString(row.Descripción),
      updatedAt: parseUpdatedAt(row),
    });
  }

  return parsed;
}

function parseTiposActividad(rows: Record<string, unknown>[]): ParsedTipoActividadImportRow[] {
  const parsed: ParsedTipoActividadImportRow[] = [];

  for (const row of rows) {
    const id = asString(row.ID) ?? asString(row.id_tipo_actividad);
    const nombre = asString(row.Nombre) ?? asString(row.nombre);
    if (!id || !nombre) {
      continue;
    }

    const activoRaw = asString(row.Activo) ?? asString(row.activo);
    parsed.push({
      id,
      codigo: asString(row.Código) ?? asString(row.codigo),
      nombre,
      activo: activoRaw ? activoRaw.toLowerCase() !== 'no' && activoRaw !== '0' : true,
      updatedAt: parseUpdatedAt(row),
    });
  }

  return parsed;
}

export function parseWorkbookForImport(workbook: XLSX.WorkBook): ParsedReporteImport {
  const metadatos = parseMetadatos(sheetToRows(workbook.Sheets.Metadatos));
  const bienes = parseBienes(sheetToRows(workbook.Sheets.Bienes));
  const ofrendas = parseOfrendas(sheetToRows(workbook.Sheets.Ofrendas));
  const tiposActividad = parseTiposActividad(
    sheetToRows(workbook.Sheets['Tipos actividad'] ?? workbook.Sheets.TiposActividad),
  );

  return { metadatos, bienes, ofrendas, tiposActividad };
}

export function validarFormatoIntercambio(metadatos: ParsedReporteMetadatos): void {
  if (metadatos.aplicacion != null && metadatos.aplicacion !== 'Fieles Bienes') {
    throw new Error('El archivo no corresponde a un reporte de Fieles Bienes');
  }

  if (
    metadatos.formatoIntercambio &&
    metadatos.formatoIntercambio !== REPORTE_INTERCAMBIO_FORMATO
  ) {
    throw new Error(
      `Formato de intercambio no compatible (${metadatos.formatoIntercambio}). Se esperaba ${REPORTE_INTERCAMBIO_FORMATO}.`,
    );
  }
}

export async function leerWorkbookDesdeUri(uri: string): Promise<XLSX.WorkBook> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('No se pudo leer el archivo seleccionado');
  }
  const buffer = await response.arrayBuffer();
  return XLSX.read(new Uint8Array(buffer), { type: 'array' });
}

export const XlsxReportParser = {
  parseWorkbookForImport,
  validarFormatoIntercambio,
  leerWorkbookDesdeUri,
};
