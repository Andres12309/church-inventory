import type { PermissionService } from '@/features/auth/application/services/PermissionService';
import type { Rol } from '@/features/auth/domain/entities/Rol';
import type { Usuario } from '@/features/auth/domain/entities/Usuario';
import type { IConsolidationService } from '@/features/configuracion/domain/services/IConsolidationService';
import { nivelOrganizacionIdParaCodigo } from '@/shared/config/hierarchyAccess';

import type { Organizacion } from '../../domain/entities/Organizacion';
import { OrganizacionValidationError } from '../../domain/errors/OrganizacionValidationError';
import type { CrearCatedralInput } from '../dto/CrearCatedralInput';
import { CodigoInternoGenerator } from '../services/CodigoInternoGenerator';
import { AdministrarOrganizacion } from './AdministrarOrganizacion';

export class CrearCatedral {
  private readonly codigoGenerator: CodigoInternoGenerator;

  constructor(
    private readonly administrarOrganizacion: AdministrarOrganizacion,
    organizacionRepository: ConstructorParameters<typeof CodigoInternoGenerator>[0],
    private readonly consolidationService: IConsolidationService,
  ) {
    this.codigoGenerator = new CodigoInternoGenerator(organizacionRepository);
  }

  async execute(
    input: CrearCatedralInput,
    usuario: Usuario,
    rol: Rol,
    permissionService: PermissionService,
  ): Promise<Organizacion> {
    const nombre = input.nombre.trim();
    if (nombre.length < 3) {
      throw new OrganizacionValidationError('El nombre de la catedral debe tener al menos 3 caracteres');
    }

    const codigoInterno = await this.codigoGenerator.generar('diocesis', null);

    const organizacion = await this.administrarOrganizacion.guardar(
      {
        nivelId: nivelOrganizacionIdParaCodigo('diocesis'),
        parentId: null,
        nombre,
        codigoInterno,
        activo: true,
        ubicacion: input.direccion?.trim()
          ? {
              direccion: input.direccion.trim(),
              ciudad: input.ciudad?.trim() || null,
              provincia: input.provincia?.trim() || null,
              latitud: null,
              longitud: null,
            }
          : undefined,
      },
      usuario,
      rol,
      permissionService,
    );

    await this.consolidationService.consolidarNodo(organizacion.id);
    return organizacion;
  }
}
