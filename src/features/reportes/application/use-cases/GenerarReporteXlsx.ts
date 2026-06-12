import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

import type { PermissionService } from '@/features/auth/application/services/PermissionService';
import type { Rol } from '@/features/auth/domain/entities/Rol';
import type { Usuario } from '@/features/auth/domain/entities/Usuario';
import type { IOrganizacionRepository } from '@/features/organizaciones/domain/repositories/IOrganizacionRepository';
import { ModuloCodigo } from '@/shared/infrastructure/database/schema';

import type { GenerarReporteInput } from '../dto/GenerarReporteInput';
import { resolverAlcanceReporte } from '../services/ReporteScopeHelper';
import type { ReporteGenerado } from '../../domain/entities/ReporteGenerado';
import type { IReporteDataRepository } from '../../domain/repositories/IReporteDataRepository';
import type { IReporteRepository } from '../../domain/repositories/IReporteRepository';
import { ReporteFileStorage } from '../../infrastructure/ReporteFileStorage';
import { buildReporteWorkbook, workbookToBytes } from '../../infrastructure/XlsxReportBuilder';

export class ReportePermissionDeniedError extends Error {
  constructor() {
    super('No tienes permiso para generar reportes');
    this.name = 'ReportePermissionDeniedError';
  }
}

export class ReporteSinDatosError extends Error {
  constructor() {
    super('No hay datos en tu alcance para generar este reporte');
    this.name = 'ReporteSinDatosError';
  }
}

function sanitizarCodigoArchivo(codigo: string): string {
  return codigo.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32);
}

function obtenerNombreDispositivo(): string {
  return Device.deviceName ?? Device.modelName ?? 'Dispositivo móvil';
}

function validarRangoFechas(fechaInicio?: string, fechaFin?: string): void {
  if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
    throw new Error('La fecha inicial no puede ser posterior a la fecha final');
  }
}

function tieneDatosParaTipo(
  tipo: GenerarReporteInput['tipo'],
  bienesCount: number,
  ofrendasCount: number,
): boolean {
  if (tipo === 'bienes') {
    return bienesCount > 0;
  }
  if (tipo === 'ofrendas') {
    return ofrendasCount > 0;
  }
  return bienesCount > 0 || ofrendasCount > 0;
}

export class GenerarReporteXlsx {
  constructor(
    private readonly reporteRepository: IReporteRepository,
    private readonly reporteDataRepository: IReporteDataRepository,
    private readonly organizacionRepository: IOrganizacionRepository,
  ) {}

  async execute(
    solicitante: Usuario,
    rolSolicitante: Rol,
    permissionService: PermissionService,
    input: GenerarReporteInput,
  ): Promise<ReporteGenerado> {
    if (!permissionService.tieneAcceso(ModuloCodigo.REPORTES)) {
      throw new ReportePermissionDeniedError();
    }

    validarRangoFechas(input.fechaInicio, input.fechaFin);

    const alcance = await resolverAlcanceReporte(
      this.organizacionRepository,
      solicitante,
      rolSolicitante,
    );

    if (alcance.orgIds.length === 0) {
      throw new ReporteSinDatosError();
    }

    const data = await this.reporteDataRepository.cargarDatos(alcance.orgIds, {
      fechaInicio: input.fechaInicio,
      fechaFin: input.fechaFin,
    });

    if (!tieneDatosParaTipo(input.tipo, data.bienes.length, data.ofrendas.length)) {
      throw new ReporteSinDatosError();
    }

    const generadoAt = new Date().toISOString();
    const appVersion = Constants.expoConfig?.version ?? '1.0.0';

    const workbook = buildReporteWorkbook(
      {
        tipo: input.tipo,
        generadoAt,
        appVersion,
        deviceName: obtenerNombreDispositivo(),
        usuarioNombre: solicitante.nombre,
        rolNombre: rolSolicitante.nombre,
        alcanceNombre: alcance.scopeOrgNombre,
        alcanceCodigo: alcance.scopeOrgCodigo,
        totalOrganizaciones: alcance.orgIds.length,
        fechaInicio: input.fechaInicio,
        fechaFin: input.fechaFin,
      },
      data,
    );

    const bytes = workbookToBytes(workbook);
    const timestamp = format(new Date(generadoAt), 'yyyyMMdd_HHmm');
    const filename = `reporte_${input.tipo}_${sanitizarCodigoArchivo(alcance.scopeOrgCodigo)}_${timestamp}.xlsx`;
    const fileUri = ReporteFileStorage.guardarReporteXlsx(filename, bytes);

    const id = uuidv4();
    await this.reporteRepository.registrar({
      id,
      organizacionId: alcance.scopeOrgId,
      tipo: input.tipo,
      fileUri,
      generadoAt,
      generadoPorUsuarioId: solicitante.id,
    });

    return {
      id,
      organizacionId: alcance.scopeOrgId,
      organizacionNombre: alcance.scopeOrgNombre,
      tipo: input.tipo,
      fileUri,
      generadoAt,
      generadoPorUsuarioId: solicitante.id,
    };
  }
}
