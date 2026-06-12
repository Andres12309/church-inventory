import type { PermissionService } from '@/features/auth/application/services/PermissionService';
import type { Rol } from '@/features/auth/domain/entities/Rol';
import type { Usuario } from '@/features/auth/domain/entities/Usuario';
import type { IOrganizacionRepository } from '@/features/organizaciones/domain/repositories/IOrganizacionRepository';
import { ModuloCodigo } from '@/shared/infrastructure/database/schema';

import { resolverAlcanceReporte } from '../services/ReporteScopeHelper';
import type { ReporteGenerado } from '../../domain/entities/ReporteGenerado';
import type { IReporteRepository } from '../../domain/repositories/IReporteRepository';

export class ReportePermissionDeniedError extends Error {
  constructor() {
    super('No tienes permiso para consultar reportes');
    this.name = 'ReportePermissionDeniedError';
  }
}

export class ListarReportesEnAlcance {
  constructor(
    private readonly reporteRepository: IReporteRepository,
    private readonly organizacionRepository: IOrganizacionRepository,
  ) {}

  async execute(
    solicitante: Usuario,
    rolSolicitante: Rol,
    permissionService: PermissionService,
  ): Promise<ReporteGenerado[]> {
    if (!permissionService.tieneAcceso(ModuloCodigo.REPORTES)) {
      throw new ReportePermissionDeniedError();
    }

    const alcance = await resolverAlcanceReporte(
      this.organizacionRepository,
      solicitante,
      rolSolicitante,
    );

    return this.reporteRepository.listarPorOrganizaciones(alcance.orgIds);
  }
}
