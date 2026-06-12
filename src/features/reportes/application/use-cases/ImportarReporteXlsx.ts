import type { SQLiteDatabase } from 'expo-sqlite';

import type { PermissionService } from '@/features/auth/application/services/PermissionService';
import type { Rol } from '@/features/auth/domain/entities/Rol';
import type { Usuario } from '@/features/auth/domain/entities/Usuario';
import type { IConsolidationTrigger } from '@/features/configuracion/application/services/IConsolidationTrigger';
import type { Bien } from '@/features/bienes/domain/entities/Bien';
import type { IBienRepository } from '@/features/bienes/domain/repositories/IBienRepository';
import type { Ofrenda } from '@/features/ofrendas/domain/entities/Ofrenda';
import type { IOfrendaRepository } from '@/features/ofrendas/domain/repositories/IOfrendaRepository';
import { redondearMonto } from '@/features/ofrendas/infrastructure/OfrendaMapper';
import type { IOrganizacionRepository } from '@/features/organizaciones/domain/repositories/IOrganizacionRepository';
import { SqliteSyncRepository } from '@/features/sync/infrastructure/SqliteSyncRepository';
import { SyncOperacion } from '@/shared/infrastructure/database/schema';
import {
  registrarBienSync,
  registrarOfrendaSync,
} from '@/shared/infrastructure/sync/SyncChangeRecorder';
import {
  getNextLamportClock,
  getOrCreateDeviceId,
} from '@/shared/infrastructure/sync/SyncContext';

import type {
  ReporteImportAccion,
  ReporteImportItemPreview,
  ReporteImportPreview,
  ReporteImportResult,
  ReporteImportResumen,
} from '../../domain/entities/ReporteImportResult';
import { resolverCapacidadesReportes } from '../services/ReportesCapabilities';
import { resolverAlcanceReporte, type ReporteAlcance } from '../services/ReporteScopeHelper';
import {
  leerWorkbookDesdeUri,
  parseWorkbookForImport,
  validarFormatoIntercambio,
  type ParsedBienImportRow,
  type ParsedOfrendaImportRow,
  type ParsedReporteImport,
} from '../../infrastructure/XlsxReportParser';

export class ReporteImportPermissionDeniedError extends Error {
  constructor() {
    super('No tienes permiso para importar reportes');
    this.name = 'ReporteImportPermissionDeniedError';
  }
}

export class ReporteImportVacioError extends Error {
  constructor() {
    super('El archivo no contiene datos importables en tu alcance');
    this.name = 'ReporteImportVacioError';
  }
}

const MAX_EJEMPLOS_PREVIEW = 24;

type ImportContext = {
  readonly parsed: ParsedReporteImport;
  readonly alcance: ReporteAlcance;
  readonly capacidades: ReturnType<typeof resolverCapacidadesReportes>;
  readonly categoriaPorNombre: Map<string, string>;
  readonly categoriaPorId: Map<string, string>;
  readonly tipoPorNombre: Map<string, string>;
  readonly tipoPorId: Map<string, string>;
};

type BienEvaluacion = {
  readonly row: ParsedBienImportRow;
  readonly accion: ReporteImportAccion;
  readonly organizacionId: string | null;
  readonly categoriaId: string | null;
  readonly existente: Bien | null;
  readonly mensaje: string | null;
};

type OfrendaEvaluacion = {
  readonly row: ParsedOfrendaImportRow;
  readonly accion: ReporteImportAccion;
  readonly organizacionId: string | null;
  readonly tipoActividadId: string | null;
  readonly existente: Ofrenda | null;
  readonly mensaje: string | null;
};

function resumenVacio(): ReporteImportResumen {
  return { insertados: 0, actualizados: 0, omitidos: 0, fueraAlcance: 0, errores: 0 };
}

function esMasReciente(importedAt: string, localAt: string): boolean {
  const imported = Date.parse(importedAt);
  const local = Date.parse(localAt);
  if (Number.isNaN(imported)) {
    return true;
  }
  if (Number.isNaN(local)) {
    return true;
  }
  return imported >= local;
}

function acumularAccion(resumen: ReporteImportResumen, accion: ReporteImportAccion): void {
  switch (accion) {
    case 'insertar':
      resumen.insertados += 1;
      break;
    case 'actualizar':
      resumen.actualizados += 1;
      break;
    case 'omitir_local_reciente':
      resumen.omitidos += 1;
      break;
    case 'fuera_alcance':
      resumen.fueraAlcance += 1;
      break;
    case 'error':
      resumen.errores += 1;
      break;
  }
}

function prioridadEjemplo(accion: ReporteImportAccion): number {
  switch (accion) {
    case 'insertar':
      return 0;
    case 'actualizar':
      return 1;
    case 'error':
      return 2;
    case 'omitir_local_reciente':
      return 3;
    case 'fuera_alcance':
      return 4;
  }
}

function seleccionarEjemplos(items: ReporteImportItemPreview[]): ReporteImportItemPreview[] {
  return [...items]
    .sort((a, b) => prioridadEjemplo(a.accion) - prioridadEjemplo(b.accion))
    .slice(0, MAX_EJEMPLOS_PREVIEW);
}

export class ImportarReporteXlsx {
  constructor(
    private readonly bienRepository: IBienRepository,
    private readonly ofrendaRepository: IOfrendaRepository,
    private readonly organizacionRepository: IOrganizacionRepository,
    private readonly db: SQLiteDatabase,
    private readonly consolidationTrigger: IConsolidationTrigger,
    private readonly syncRepository: SqliteSyncRepository,
  ) {}

  async previsualizar(
    fileUri: string,
    fileName: string,
    solicitante: Usuario,
    rolSolicitante: Rol,
    permissionService: PermissionService,
  ): Promise<ReporteImportPreview> {
    const contexto = await this.prepararContexto(fileUri, solicitante, rolSolicitante, permissionService);
    const { bienes, ofrendas, ejemplos, mensajesError } = await this.evaluarImportacion(contexto);

    const totalAplicable = bienes.insertados + bienes.actualizados + ofrendas.insertados + ofrendas.actualizados;

    return {
      fileUri,
      fileName,
      bienes,
      ofrendas,
      origenAlcance: contexto.parsed.metadatos.alcance,
      origenGeneradoAt: contexto.parsed.metadatos.generadoAtIso,
      origenDispositivo: contexto.parsed.metadatos.dispositivo,
      mensajesError,
      ejemplos: seleccionarEjemplos(ejemplos),
      totalAplicable,
      puedeAplicar: totalAplicable > 0,
    };
  }

  async aplicar(
    fileUri: string,
    solicitante: Usuario,
    rolSolicitante: Rol,
    permissionService: PermissionService,
  ): Promise<ReporteImportResult> {
    const contexto = await this.prepararContexto(fileUri, solicitante, rolSolicitante, permissionService);
    const evaluacion = await this.evaluarImportacion(contexto);

    const totalAplicable =
      evaluacion.bienes.insertados +
      evaluacion.bienes.actualizados +
      evaluacion.ofrendas.insertados +
      evaluacion.ofrendas.actualizados;

    if (totalAplicable === 0) {
      throw new ReporteImportVacioError();
    }

    const orgsAfectadas = new Set<string>();
    await this.persistirBienes(contexto, evaluacion.bienesEvaluaciones, orgsAfectadas);
    await this.persistirOfrendas(contexto, evaluacion.ofrendasEvaluaciones, orgsAfectadas);

    for (const orgId of orgsAfectadas) {
      this.consolidationTrigger.dispararParaOrganizacion(orgId);
    }

    return {
      bienes: evaluacion.bienes,
      ofrendas: evaluacion.ofrendas,
      origenAlcance: contexto.parsed.metadatos.alcance,
      origenGeneradoAt: contexto.parsed.metadatos.generadoAtIso,
      origenDispositivo: contexto.parsed.metadatos.dispositivo,
      mensajesError: evaluacion.mensajesError,
    };
  }

  /** @deprecated Usar `aplicar`. Mantenido por compatibilidad interna. */
  async execute(
    fileUri: string,
    solicitante: Usuario,
    rolSolicitante: Rol,
    permissionService: PermissionService,
  ): Promise<ReporteImportResult> {
    return this.aplicar(fileUri, solicitante, rolSolicitante, permissionService);
  }

  private async prepararContexto(
    fileUri: string,
    solicitante: Usuario,
    rolSolicitante: Rol,
    permissionService: PermissionService,
  ): Promise<ImportContext> {
    const capacidades = resolverCapacidadesReportes(permissionService);
    if (!capacidades.tieneModulo || !capacidades.puedeImportar) {
      throw new ReporteImportPermissionDeniedError();
    }

    const workbook = await leerWorkbookDesdeUri(fileUri);
    const parsed = parseWorkbookForImport(workbook);
    validarFormatoIntercambio(parsed.metadatos);

    const alcance = await resolverAlcanceReporte(
      this.organizacionRepository,
      solicitante,
      rolSolicitante,
    );

    const categorias = capacidades.puedeImportarBienes
      ? await this.bienRepository.listarCategorias()
      : [];
    const tiposActividad = capacidades.puedeImportarOfrendas
      ? await this.ofrendaRepository.listarTiposActividad()
      : [];

    return {
      parsed,
      alcance,
      capacidades,
      categoriaPorNombre: new Map(categorias.map((item) => [item.nombre.toLowerCase(), item.id])),
      categoriaPorId: new Map(categorias.map((item) => [item.id, item.id])),
      tipoPorNombre: new Map(tiposActividad.map((item) => [item.nombre.toLowerCase(), item.id])),
      tipoPorId: new Map(tiposActividad.map((item) => [item.id, item.id])),
    };
  }

  private async evaluarImportacion(contexto: ImportContext): Promise<{
    bienes: ReporteImportResumen;
    ofrendas: ReporteImportResumen;
    bienesEvaluaciones: BienEvaluacion[];
    ofrendasEvaluaciones: OfrendaEvaluacion[];
    ejemplos: ReporteImportItemPreview[];
    mensajesError: string[];
  }> {
    const mensajesError: string[] = [];
    const ejemplos: ReporteImportItemPreview[] = [];

    let bienesEvaluaciones: BienEvaluacion[] = [];
    let ofrendasEvaluaciones: OfrendaEvaluacion[] = [];

    if (contexto.capacidades.puedeImportarBienes && contexto.parsed.bienes.length > 0) {
      bienesEvaluaciones = await this.evaluarBienes(contexto, mensajesError, ejemplos);
    }

    if (contexto.capacidades.puedeImportarOfrendas && contexto.parsed.ofrendas.length > 0) {
      ofrendasEvaluaciones = await this.evaluarOfrendas(contexto, mensajesError, ejemplos);
    }

    const bienes = resumenVacio();
    const ofrendas = resumenVacio();

    for (const item of bienesEvaluaciones) {
      acumularAccion(bienes, item.accion);
    }
    for (const item of ofrendasEvaluaciones) {
      acumularAccion(ofrendas, item.accion);
    }

    return { bienes, ofrendas, bienesEvaluaciones, ofrendasEvaluaciones, ejemplos, mensajesError };
  }

  private resolverOrganizacionId(
    rowOrgId: string | null,
    rowOrgCodigo: string | null,
    alcance: ReporteAlcance,
  ): string | null {
    if (rowOrgId && alcance.orgIdSet.has(rowOrgId)) {
      return rowOrgId;
    }
    if (rowOrgCodigo) {
      return alcance.orgCodigoToId.get(rowOrgCodigo) ?? null;
    }
    return null;
  }

  private async evaluarBienes(
    contexto: ImportContext,
    mensajesError: string[],
    ejemplos: ReporteImportItemPreview[],
  ): Promise<BienEvaluacion[]> {
    const evaluaciones: BienEvaluacion[] = [];

    for (const row of contexto.parsed.bienes) {
      const organizacionId = this.resolverOrganizacionId(
        row.organizacionId,
        row.orgCodigo,
        contexto.alcance,
      );

      if (!organizacionId) {
        const evaluacion: BienEvaluacion = {
          row,
          accion: 'fuera_alcance',
          organizacionId: null,
          categoriaId: null,
          existente: null,
          mensaje: null,
        };
        evaluaciones.push(evaluacion);
        ejemplos.push({
          tipo: 'bien',
          accion: 'fuera_alcance',
          titulo: row.nombre,
          subtitulo: row.orgCodigo ?? 'Organización desconocida',
          detalle: 'No está en tu alcance jerárquico',
        });
        continue;
      }

      const categoriaId =
        (row.categoriaId && contexto.categoriaPorId.get(row.categoriaId)) ??
        (row.categoriaNombre
          ? contexto.categoriaPorNombre.get(row.categoriaNombre.toLowerCase())
          : undefined);

      if (!categoriaId) {
        const mensaje = `Bien "${row.nombre}": categoría no reconocida`;
        mensajesError.push(mensaje);
        evaluaciones.push({
          row,
          accion: 'error',
          organizacionId,
          categoriaId: null,
          existente: null,
          mensaje,
        });
        ejemplos.push({
          tipo: 'bien',
          accion: 'error',
          titulo: row.nombre,
          subtitulo: row.categoriaNombre ?? 'Sin categoría',
          detalle: mensaje,
        });
        continue;
      }

      const existente = await this.bienRepository.obtenerPorId(row.id);

      if (existente && existente.organizacionId !== organizacionId) {
        const mensaje = `Bien "${row.nombre}": conflicto de organización`;
        mensajesError.push(mensaje);
        evaluaciones.push({
          row,
          accion: 'error',
          organizacionId,
          categoriaId,
          existente,
          mensaje,
        });
        ejemplos.push({
          tipo: 'bien',
          accion: 'error',
          titulo: row.nombre,
          subtitulo: row.orgCodigo ?? organizacionId,
          detalle: mensaje,
        });
        continue;
      }

      if (existente && !esMasReciente(row.updatedAt, existente.updatedAt)) {
        evaluaciones.push({
          row,
          accion: 'omitir_local_reciente',
          organizacionId,
          categoriaId,
          existente,
          mensaje: null,
        });
        ejemplos.push({
          tipo: 'bien',
          accion: 'omitir_local_reciente',
          titulo: row.nombre,
          subtitulo: row.orgCodigo ?? organizacionId,
          detalle: 'Tu copia local es más reciente',
        });
        continue;
      }

      const accion: ReporteImportAccion = existente ? 'actualizar' : 'insertar';
      evaluaciones.push({
        row,
        accion,
        organizacionId,
        categoriaId,
        existente,
        mensaje: null,
      });
      ejemplos.push({
        tipo: 'bien',
        accion,
        titulo: row.nombre,
        subtitulo: `${row.orgCodigo ?? organizacionId} · ${row.categoriaNombre ?? 'Bien'}`,
        detalle: accion === 'insertar' ? 'Se creará en SQLite local' : 'Se sobrescribirá con datos del Excel',
      });
    }

    return evaluaciones;
  }

  private async evaluarOfrendas(
    contexto: ImportContext,
    mensajesError: string[],
    ejemplos: ReporteImportItemPreview[],
  ): Promise<OfrendaEvaluacion[]> {
    const evaluaciones: OfrendaEvaluacion[] = [];

    for (const row of contexto.parsed.ofrendas) {
      const organizacionId = this.resolverOrganizacionId(
        row.organizacionId,
        row.orgCodigo,
        contexto.alcance,
      );

      if (!organizacionId) {
        evaluaciones.push({
          row,
          accion: 'fuera_alcance',
          organizacionId: null,
          tipoActividadId: null,
          existente: null,
          mensaje: null,
        });
        ejemplos.push({
          tipo: 'ofrenda',
          accion: 'fuera_alcance',
          titulo: `${row.fecha} · $${row.monto}`,
          subtitulo: row.orgCodigo ?? 'Organización desconocida',
          detalle: 'No está en tu alcance jerárquico',
        });
        continue;
      }

      const tipoActividadId =
        (row.tipoActividadId && contexto.tipoPorId.get(row.tipoActividadId)) ??
        (row.tipoActividadNombre
          ? contexto.tipoPorNombre.get(row.tipoActividadNombre.toLowerCase())
          : undefined);

      if (!tipoActividadId) {
        const mensaje = `Ofrenda ${row.fecha}: tipo de actividad no reconocido`;
        mensajesError.push(mensaje);
        evaluaciones.push({
          row,
          accion: 'error',
          organizacionId,
          tipoActividadId: null,
          existente: null,
          mensaje,
        });
        ejemplos.push({
          tipo: 'ofrenda',
          accion: 'error',
          titulo: `${row.fecha} · $${row.monto}`,
          subtitulo: row.tipoActividadNombre ?? 'Sin tipo',
          detalle: mensaje,
        });
        continue;
      }

      const existente = await this.ofrendaRepository.obtenerPorId(row.id);

      if (existente && existente.organizacionId !== organizacionId) {
        const mensaje = `Ofrenda ${row.fecha}: conflicto de organización`;
        mensajesError.push(mensaje);
        evaluaciones.push({
          row,
          accion: 'error',
          organizacionId,
          tipoActividadId,
          existente,
          mensaje,
        });
        ejemplos.push({
          tipo: 'ofrenda',
          accion: 'error',
          titulo: `${row.fecha} · $${row.monto}`,
          subtitulo: row.orgCodigo ?? organizacionId,
          detalle: mensaje,
        });
        continue;
      }

      if (existente && !esMasReciente(row.updatedAt, existente.updatedAt)) {
        evaluaciones.push({
          row,
          accion: 'omitir_local_reciente',
          organizacionId,
          tipoActividadId,
          existente,
          mensaje: null,
        });
        ejemplos.push({
          tipo: 'ofrenda',
          accion: 'omitir_local_reciente',
          titulo: `${row.fecha} · $${row.monto}`,
          subtitulo: row.tipoActividadNombre ?? 'Ofrenda',
          detalle: 'Tu copia local es más reciente',
        });
        continue;
      }

      const accion: ReporteImportAccion = existente ? 'actualizar' : 'insertar';
      evaluaciones.push({
        row,
        accion,
        organizacionId,
        tipoActividadId,
        existente,
        mensaje: null,
      });
      ejemplos.push({
        tipo: 'ofrenda',
        accion,
        titulo: `${row.fecha} · $${row.monto}`,
        subtitulo: `${row.orgCodigo ?? organizacionId} · ${row.tipoActividadNombre ?? 'Ingreso'}`,
        detalle: accion === 'insertar' ? 'Se creará en SQLite local' : 'Se sobrescribirá con datos del Excel',
      });
    }

    return evaluaciones;
  }

  private async persistirBienes(
    _contexto: ImportContext,
    evaluaciones: BienEvaluacion[],
    orgsAfectadas: Set<string>,
  ): Promise<void> {
    const deviceId = await getOrCreateDeviceId(this.db);
    const now = new Date().toISOString();

    for (const item of evaluaciones) {
      if (item.accion !== 'insertar' && item.accion !== 'actualizar') {
        continue;
      }
      if (!item.organizacionId || !item.categoriaId) {
        continue;
      }

      const lamportClock = await getNextLamportClock(this.db);
      const bien: Bien = {
        id: item.row.id,
        organizacionId: item.organizacionId,
        categoriaId: item.categoriaId,
        nombre: item.row.nombre,
        descripcion: item.row.descripcion,
        estado: item.row.estado,
        cantidad: item.row.cantidad,
        valorEstimado: item.row.valorEstimado,
        fotoUri: item.existente?.fotoUri ?? null,
        observaciones: item.row.observaciones,
        activo: true,
        syncVector: JSON.stringify({ [deviceId]: lamportClock }),
        updatedAt: item.row.updatedAt || now,
        updatedByDevice: deviceId,
      };

      await this.bienRepository.guardar(bien);
      await registrarBienSync(
        this.db,
        this.syncRepository,
        bien.id,
        item.existente ? SyncOperacion.UPDATE : SyncOperacion.INSERT,
      );
      orgsAfectadas.add(item.organizacionId);
    }
  }

  private async persistirOfrendas(
    _contexto: ImportContext,
    evaluaciones: OfrendaEvaluacion[],
    orgsAfectadas: Set<string>,
  ): Promise<void> {
    const deviceId = await getOrCreateDeviceId(this.db);
    const now = new Date().toISOString();

    for (const item of evaluaciones) {
      if (item.accion !== 'insertar' && item.accion !== 'actualizar') {
        continue;
      }
      if (!item.organizacionId || !item.tipoActividadId) {
        continue;
      }

      const lamportClock = await getNextLamportClock(this.db);
      const ofrenda: Ofrenda = {
        id: item.row.id,
        organizacionId: item.organizacionId,
        tipoActividadId: item.tipoActividadId,
        monto: redondearMonto(item.row.monto),
        fecha: item.row.fecha,
        descripcion: item.row.descripcion,
        activo: true,
        syncVector: JSON.stringify({ [deviceId]: lamportClock }),
        updatedAt: item.row.updatedAt || now,
        updatedByDevice: deviceId,
      };

      await this.ofrendaRepository.guardar(ofrenda);
      await registrarOfrendaSync(
        this.db,
        this.syncRepository,
        ofrenda.id,
        item.existente ? SyncOperacion.UPDATE : SyncOperacion.INSERT,
      );
      orgsAfectadas.add(item.organizacionId);
    }
  }
}
