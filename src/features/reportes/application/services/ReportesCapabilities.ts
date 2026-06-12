import type { PermissionService } from '@/features/auth/application/services/PermissionService';
import { ModuloCodigo } from '@/shared/infrastructure/database/schema';

import type { ReporteTipo } from '../../domain/entities/ReporteGenerado';

export type ReportesCapabilities = {
  readonly tieneModulo: boolean;
  readonly puedeExportar: boolean;
  readonly puedeImportar: boolean;
  readonly puedeImportarBienes: boolean;
  readonly puedeImportarOfrendas: boolean;
  readonly tiposExportacion: readonly ReporteTipo[];
  readonly etiquetaAlcance: string;
};

export function resolverCapacidadesReportes(
  permissionService: PermissionService,
): ReportesCapabilities {
  const tieneModulo = permissionService.tieneAcceso(ModuloCodigo.REPORTES);
  const puedeBienes = permissionService.tieneAcceso(ModuloCodigo.INVENTARIO_BIENES);
  const puedeOfrendas = permissionService.tieneAcceso(ModuloCodigo.OFRENDAS);

  if (!tieneModulo) {
    return {
      tieneModulo: false,
      puedeExportar: false,
      puedeImportar: false,
      puedeImportarBienes: false,
      puedeImportarOfrendas: false,
      tiposExportacion: [],
      etiquetaAlcance: 'Sin acceso',
    };
  }

  const tiposExportacion: ReporteTipo[] = [];
  if (puedeBienes && puedeOfrendas) {
    tiposExportacion.push('consolidado');
  }
  if (puedeBienes) {
    tiposExportacion.push('bienes');
  }
  if (puedeOfrendas) {
    tiposExportacion.push('ofrendas');
  }

  const partes: string[] = [];
  if (puedeBienes) {
    partes.push('inventario');
  }
  if (puedeOfrendas) {
    partes.push('finanzas');
  }

  return {
    tieneModulo: true,
    puedeExportar: tiposExportacion.length > 0,
    puedeImportar: puedeBienes || puedeOfrendas,
    puedeImportarBienes: puedeBienes,
    puedeImportarOfrendas: puedeOfrendas,
    tiposExportacion,
    etiquetaAlcance: partes.length > 0 ? partes.join(' + ') : 'solo consulta',
  };
}
