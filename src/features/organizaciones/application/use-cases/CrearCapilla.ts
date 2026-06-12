import type { PermissionService } from '@/features/auth/application/services/PermissionService';
import type { Rol } from '@/features/auth/domain/entities/Rol';
import type { Usuario } from '@/features/auth/domain/entities/Usuario';
import type { IConsolidationService } from '@/features/configuracion/domain/services/IConsolidationService';
import { SeedIds } from '@/shared/infrastructure/database/schema';

import type { Organizacion } from '../../domain/entities/Organizacion';
import { OrganizacionValidationError } from '../../domain/errors/OrganizacionValidationError';
import type { CrearCapillaInput } from '../dto/CrearCapillaInput';
import { CodigoInternoGenerator } from '../services/CodigoInternoGenerator';
import { AdministrarOrganizacion } from './AdministrarOrganizacion';

export class CrearCapilla {
  private readonly codigoGenerator: CodigoInternoGenerator;

  constructor(
    private readonly administrarOrganizacion: AdministrarOrganizacion,
    organizacionRepository: ConstructorParameters<typeof CodigoInternoGenerator>[0],
    private readonly consolidationService: IConsolidationService,
  ) {
    this.codigoGenerator = new CodigoInternoGenerator(organizacionRepository);
  }

  async execute(
    input: CrearCapillaInput,
    usuario: Usuario,
    rol: Rol,
    permissionService: PermissionService,
  ): Promise<Organizacion> {
    const nombre = input.nombre.trim();
    const sectorReferencia = input.sectorReferencia.trim();

    if (nombre.length < 3) {
      throw new OrganizacionValidationError('El nombre de la capilla debe tener al menos 3 caracteres');
    }

    if (sectorReferencia.length < 3) {
      throw new OrganizacionValidationError('Indica un sector o referencia geográfica válida');
    }

    const codigoInterno = await this.codigoGenerator.generar('capilla', input.parentId);

    const organizacion = await this.administrarOrganizacion.guardar(
      {
        nivelId: SeedIds.NIVELES.CAPILLA,
        parentId: input.parentId,
        nombre,
        codigoInterno,
        activo: true,
        ubicacion: {
          direccion: sectorReferencia,
          ciudad: input.ciudad?.trim() || null,
          provincia: input.provincia?.trim() || null,
          latitud: null,
          longitud: null,
        },
      },
      usuario,
      rol,
      permissionService,
    );

    await this.consolidationService.consolidarNodo(input.parentId);

    return organizacion;
  }
}
