import type { PermissionService } from '@/features/auth/application/services/PermissionService';
import { ModuloCodigo } from '@/shared/infrastructure/database/schema';

import type { ResumenSistema } from '../../domain/entities/ResumenSistema';
import type { ISistemaRepository } from '../../domain/repositories/ISistemaRepository';

export class ConfiguracionPermissionDeniedError extends Error {
  constructor() {
    super('No tienes permiso para consultar la configuración del sistema');
    this.name = 'ConfiguracionPermissionDeniedError';
  }
}

export class ObtenerResumenSistema {
  constructor(private readonly sistemaRepository: ISistemaRepository) {}

  async execute(permissionService: PermissionService): Promise<ResumenSistema> {
    if (!permissionService.tieneAcceso(ModuloCodigo.CONFIGURACION)) {
      throw new ConfiguracionPermissionDeniedError();
    }

    return this.sistemaRepository.obtenerResumen();
  }
}
