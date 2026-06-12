import type { IConsolidationService } from '../../domain/services/IConsolidationService';
import type { IConsolidationTrigger } from '../services/IConsolidationTrigger';

export class DispararConsolidacionAsincrona implements IConsolidationTrigger {
  constructor(private readonly consolidationService: IConsolidationService) {}

  dispararParaOrganizacion(orgId: string): void {
    void this.consolidationService.consolidarNodo(orgId).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      console.warn(`[Consolidation] Falló consolidación async para ${orgId}: ${message}`);
    });
  }
}
