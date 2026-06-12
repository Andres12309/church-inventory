import * as XLSX from 'xlsx';

import { BienEstado } from '@/shared/infrastructure/database/schema';

import type { ReporteExportData } from '../domain/entities/ReporteExportData';
import type { ReporteTipo } from '../domain/entities/ReporteGenerado';
import { REPORTE_INTERCAMBIO_FORMATO } from '../domain/entities/ReporteImportResult';

export type ReporteBuildMetadata = {
  readonly tipo: ReporteTipo;
  readonly generadoAt: string;
  readonly appVersion: string;
  readonly deviceName: string;
  readonly usuarioNombre: string;
  readonly rolNombre: string;
  readonly alcanceNombre: string;
  readonly alcanceCodigo: string;
  readonly totalOrganizaciones: number;
  readonly fechaInicio?: string;
  readonly fechaFin?: string;
};

const ESTADO_ETIQUETA: Record<string, string> = {
  [BienEstado.EXCELENTE]: 'Excelente',
  [BienEstado.BUENO]: 'Bueno',
  [BienEstado.REGULAR]: 'Regular',
  [BienEstado.MALO]: 'Malo',
};

function etiquetaEstado(estado: string): string {
  return ESTADO_ETIQUETA[estado] ?? estado;
}

function formatearMoneda(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function formatearFecha(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function autoColumnWidths(rows: Record<string, unknown>[]): XLSX.ColInfo[] {
  if (rows.length === 0) {
    return [];
  }

  const keys = Object.keys(rows[0]!);
  return keys.map((key) => {
    const maxLen = Math.max(
      key.length,
      ...rows.map((row) => String(row[key] ?? '').length),
    );
    return { wch: Math.min(48, maxLen + 2) };
  });
}

function appendSheetFromRows(
  workbook: XLSX.WorkBook,
  name: string,
  rows: Record<string, unknown>[],
): void {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const widths = autoColumnWidths(rows);
  if (widths.length > 0) {
    sheet['!cols'] = widths;
  }
  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

function appendSheetFromAoa(workbook: XLSX.WorkBook, name: string, rows: unknown[][]): void {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

function construirHojaResumenAoa(
  metadata: ReporteBuildMetadata,
  data: ReporteExportData,
  incluirBienes: boolean,
  incluirOfrendas: boolean,
): unknown[][] {
  const totalBienes = data.bienes.reduce((acc, row) => acc + row.cantidad, 0);
  const valorInventario = data.bienes.reduce((acc, row) => acc + row.valorTotal, 0);
  const totalOfrendas = data.ofrendas.reduce((acc, row) => acc + row.monto, 0);

  const aoa: unknown[][] = [
    ['Indicador', 'Valor'],
    ['Organización alcance', metadata.alcanceNombre],
    ['Código alcance', metadata.alcanceCodigo],
    ['Organizaciones en alcance', metadata.totalOrganizaciones],
  ];

  if (incluirBienes) {
    aoa.push(
      ['Ítems de inventario (unidades)', totalBienes],
      ['Registros de bienes', data.bienes.length],
      ['Valor inventario estimado (USD)', formatearMoneda(valorInventario)],
    );
  }

  if (incluirOfrendas) {
    aoa.push(
      ['Total ofrendas / ingresos (USD)', formatearMoneda(totalOfrendas)],
      ['Registros de ofrendas', data.ofrendas.length],
    );
    if (metadata.fechaInicio) {
      aoa.push(['Filtro desde', metadata.fechaInicio]);
    }
    if (metadata.fechaFin) {
      aoa.push(['Filtro hasta', metadata.fechaFin]);
    }
  }

  aoa.push(['Generado el', formatearFecha(metadata.generadoAt)], []);

  const headers: string[] = [
    'Organización',
    'Código',
    'Nivel',
    'Total bienes',
    'Excelente',
    'Bueno',
    'Regular',
    'Malo',
    'Valor inventario (USD)',
    'Total ofrendas (USD)',
  ];

  if (incluirOfrendas) {
    for (const tipo of data.catalogoTiposActividad) {
      headers.push(`Ofrendas: ${tipo.nombre}`);
    }
  }

  headers.push('Agregado calculado');
  aoa.push(headers);

  for (const row of data.resumen) {
    const fila: unknown[] = [
      row.orgNombre,
      row.orgCodigo,
      row.nivel,
      incluirBienes ? row.totalBienes : '—',
      incluirBienes ? row.bienesExcelente : '—',
      incluirBienes ? row.bienesBueno : '—',
      incluirBienes ? row.bienesRegular : '—',
      incluirBienes ? row.bienesMalo : '—',
      incluirBienes ? formatearMoneda(row.valorInventarioEstimado) : '—',
      incluirOfrendas ? formatearMoneda(row.totalOfrendas) : '—',
    ];

    if (incluirOfrendas) {
      for (const tipo of data.catalogoTiposActividad) {
        fila.push(formatearMoneda(row.ofrendasPorTipo[tipo.id] ?? 0));
      }
    }

    fila.push(row.calculadoAt ? formatearFecha(row.calculadoAt) : 'Sin calcular');
    aoa.push(fila);
  }

  return aoa;
}

function construirHojaBienes(data: ReporteExportData): Record<string, unknown>[] {
  return data.bienes.map((row) => ({
    'Código org.': row.orgCodigo,
    Organización: row.orgNombre,
    Categoría: row.categoria,
    Nombre: row.nombre,
    Descripción: row.descripcion ?? '',
    Estado: etiquetaEstado(row.estado),
    Cantidad: row.cantidad,
    'Valor unitario (USD)': formatearMoneda(row.valorEstimado),
    'Valor total (USD)': formatearMoneda(row.valorTotal),
    Observaciones: row.observaciones ?? '',
    'Última actualización': formatearFecha(row.updatedAt),
    ID: row.id,
    id_organizacion: row.organizacionId,
    id_categoria: row.categoriaId,
    updated_at_iso: row.updatedAt,
  }));
}

function construirHojaOfrendas(data: ReporteExportData): Record<string, unknown>[] {
  return data.ofrendas.map((row) => ({
    Fecha: row.fecha,
    'Código org.': row.orgCodigo,
    Organización: row.orgNombre,
    'Tipo actividad': row.tipoActividad,
    Naturaleza: row.naturaleza,
    'Monto (USD)': formatearMoneda(row.monto),
    Descripción: row.descripcion ?? '',
    'Última actualización': formatearFecha(row.updatedAt),
    ID: row.id,
    id_organizacion: row.organizacionId,
    id_tipo_actividad: row.tipoActividadId,
    updated_at_iso: row.updatedAt,
  }));
}

function construirHojaTiposActividad(data: ReporteExportData): Record<string, unknown>[] {
  return data.catalogoTiposActividad.map((row) => ({
    Nombre: row.nombre,
    Código: row.codigo,
    Naturaleza: row.naturaleza,
    Activo: row.activo ? 'Sí' : 'No',
    ID: row.id,
    id_tipo_actividad: row.id,
    codigo: row.codigo,
    updated_at_iso: row.updatedAt,
  }));
}

function construirHojaOrganizaciones(data: ReporteExportData): Record<string, unknown>[] {
  return data.organizaciones.map((row) => ({
    Código: row.codigoInterno,
    Nombre: row.nombre,
    Nivel: row.nivelNombre,
    'Código padre': row.parentCodigo ?? '',
    'Organización padre': row.parentNombre ?? '',
    Ciudad: row.ciudad ?? '',
    Provincia: row.provincia ?? '',
    Activa: row.activo ? 'Sí' : 'No',
    ID: row.id,
  }));
}

function construirHojaMetadatos(metadata: ReporteBuildMetadata): Record<string, unknown>[] {
  const filas: Record<string, unknown>[] = [
    { Campo: 'Aplicación', Valor: 'Fieles Bienes' },
    { Campo: 'Versión', Valor: metadata.appVersion },
    { Campo: 'Dispositivo', Valor: metadata.deviceName },
    { Campo: 'Tipo de reporte', Valor: metadata.tipo },
    { Campo: 'Generado el', Valor: formatearFecha(metadata.generadoAt) },
    { Campo: 'Usuario', Valor: metadata.usuarioNombre },
    { Campo: 'Rol', Valor: metadata.rolNombre },
    { Campo: 'Alcance', Valor: metadata.alcanceNombre },
    { Campo: 'Código alcance', Valor: metadata.alcanceCodigo },
    { Campo: 'Organizaciones incluidas', Valor: metadata.totalOrganizaciones },
  ];

  if (metadata.fechaInicio) {
    filas.push({ Campo: 'Filtro ofrendas desde', Valor: metadata.fechaInicio });
  }
  if (metadata.fechaFin) {
    filas.push({ Campo: 'Filtro ofrendas hasta', Valor: metadata.fechaFin });
  }

  filas.push(
    { Campo: 'Formato', Valor: 'Microsoft Excel (.xlsx)' },
    { Campo: 'Formato intercambio', Valor: REPORTE_INTERCAMBIO_FORMATO },
    { Campo: 'generado_at_iso', Valor: metadata.generadoAt },
    { Campo: 'Generado offline', Valor: 'Sí — datos locales SQLite' },
  );

  return filas;
}

export function buildReporteWorkbook(
  metadata: ReporteBuildMetadata,
  data: ReporteExportData,
): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();
  const incluirBienes = metadata.tipo === 'bienes' || metadata.tipo === 'consolidado';
  const incluirOfrendas = metadata.tipo === 'ofrendas' || metadata.tipo === 'consolidado';

  appendSheetFromAoa(
    workbook,
    'Resumen',
    construirHojaResumenAoa(metadata, data, incluirBienes, incluirOfrendas),
  );

  if (incluirBienes) {
    appendSheetFromRows(workbook, 'Bienes', construirHojaBienes(data));
  }

  if (incluirOfrendas) {
    appendSheetFromRows(workbook, 'Ofrendas', construirHojaOfrendas(data));
    appendSheetFromRows(workbook, 'Tipos actividad', construirHojaTiposActividad(data));
  }

  appendSheetFromRows(workbook, 'Organizaciones', construirHojaOrganizaciones(data));
  appendSheetFromRows(workbook, 'Metadatos', construirHojaMetadatos(metadata));

  return workbook;
}

export function workbookToBytes(workbook: XLSX.WorkBook): Uint8Array {
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return new Uint8Array(buffer);
}

export const XlsxReportBuilder = {
  buildReporteWorkbook,
  workbookToBytes,
};
