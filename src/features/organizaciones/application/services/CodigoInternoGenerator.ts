import type { NivelOrganizacionCodigo } from '@/shared/config/hierarchy';
import { SeedIds } from '@/shared/infrastructure/database/schema';

import type { IOrganizacionRepository } from '../../domain/repositories/IOrganizacionRepository';

const PREFIJO_POR_NIVEL: Record<NivelOrganizacionCodigo, string> = {
  diocesis: 'CAT',
  parroquia: 'PAR',
  capilla: 'CAP',
};

const NIVEL_ID_POR_CODIGO: Record<NivelOrganizacionCodigo, string> = {
  diocesis: SeedIds.NIVELES.DIOCESIS,
  parroquia: SeedIds.NIVELES.PARROQUIA,
  capilla: SeedIds.NIVELES.CAPILLA,
};

export class CodigoInternoGenerator {
  constructor(private readonly repository: IOrganizacionRepository) {}

  async generar(
    nivelCodigo: NivelOrganizacionCodigo,
    parentId: string | null,
  ): Promise<string> {
    const prefijo = PREFIJO_POR_NIVEL[nivelCodigo];
    const nivelId = NIVEL_ID_POR_CODIGO[nivelCodigo];

    const hermanos =
      nivelCodigo === 'diocesis'
        ? await this.repository.listarHijosDirectos(null)
        : (await this.repository.listarHijosDirectos(parentId!)).filter(
            (org) => org.nivelId === nivelId,
          );

    const numeros = hermanos
      .map((org) => org.codigoInterno)
      .filter((codigo) => codigo.startsWith(`${prefijo}-`))
      .map((codigo) => Number.parseInt(codigo.slice(prefijo.length + 1), 10))
      .filter((n) => Number.isFinite(n));

    const siguiente = numeros.length > 0 ? Math.max(...numeros) + 1 : 1;
    return `${prefijo}-${String(siguiente).padStart(3, '0')}`;
  }
}
