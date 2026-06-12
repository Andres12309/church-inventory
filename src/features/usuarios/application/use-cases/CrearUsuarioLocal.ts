import type { PermissionService } from '@/features/auth/application/services/PermissionService';
import type { Rol } from '@/features/auth/domain/entities/Rol';
import type { Usuario } from '@/features/auth/domain/entities/Usuario';
import { OrganizacionNotFoundError } from '@/features/organizaciones/domain/errors/OrganizacionNotFoundError';
import type { IOrganizacionRepository } from '@/features/organizaciones/domain/repositories/IOrganizacionRepository';
import { etiquetaJerarquiaRol } from '@/shared/config/hierarchyAccess';
import { UserRoleCodigo } from '@/shared/infrastructure/database/schema';

import type { CrearUsuarioLocalInput } from '../dto/CrearUsuarioLocalInput';
import {
  nivelOrganizacionIdParaRol,
  puedeRegistrarUsuarios,
  rolesAsignablesPorCreador,
  validarPinLocal,
} from '../services/UsuarioAccessPolicy';
import {
  UsuarioPermissionDeniedError,
  UsuarioValidationError,
} from '../../domain/errors/UsuarioLocalError';
import type { IUsuarioLocalRepository } from '../../domain/repositories/IUsuarioLocalRepository';

export class CrearUsuarioLocal {
  constructor(
    private readonly usuarioRepository: IUsuarioLocalRepository,
    private readonly organizacionRepository: IOrganizacionRepository,
  ) {}

  async execute(
    input: CrearUsuarioLocalInput,
    creador: Usuario,
    rolCreador: Rol,
    permissionService: PermissionService,
  ): Promise<Usuario> {
    if (!puedeRegistrarUsuarios(permissionService)) {
      throw new UsuarioPermissionDeniedError();
    }

    const nombre = input.nombre.trim();
    const username = input.username.trim().toLowerCase();

    if (username.length < 3) {
      throw new UsuarioValidationError('El usuario debe tener al menos 3 caracteres');
    }

    if (!/^[a-z0-9._-]+$/.test(username)) {
      throw new UsuarioValidationError('El usuario solo puede contener letras, números, puntos, guiones y guion bajo');
    }

    if (nombre.length < 3) {
      throw new UsuarioValidationError('El nombre debe tener al menos 3 caracteres');
    }

    const pinError = validarPinLocal(input.pin, input.pinConfirmacion);
    if (pinError) {
      throw new UsuarioValidationError(pinError);
    }

    const rolNuevo = await this.usuarioRepository
      .listarRolesPorCodigos(rolesAsignablesPorCreador(rolCreador))
      .then((roles) => roles.find((rol) => rol.id === input.roleId) ?? null);

    if (!rolNuevo) {
      throw new UsuarioValidationError('El rol seleccionado no está permitido para tu perfil');
    }

    const organizacion = await this.organizacionRepository.obtenerPorId(input.organizacionId);
    if (!organizacion) {
      throw new OrganizacionNotFoundError(input.organizacionId);
    }

    const nivelEsperado = nivelOrganizacionIdParaRol(rolNuevo.codigo);
    if (organizacion.nivelId !== nivelEsperado) {
      const etiqueta = etiquetaJerarquiaRol(rolNuevo.codigo).toLowerCase();
      throw new UsuarioValidationError(`Debes asignar una ${etiqueta} válida al nuevo usuario`);
    }

    if (rolCreador.codigo !== UserRoleCodigo.SUPER_ADMIN) {
      const subarbol = await this.organizacionRepository.obtenerSubarbol(creador.organizacionId);
      const idsPermitidos = new Set(subarbol.map((org) => org.id));
      if (!idsPermitidos.has(organizacion.id)) {
        throw new UsuarioPermissionDeniedError();
      }
    }

    const nombreDuplicado = await this.usuarioRepository.existeNombreEnOrganizacion(
      nombre,
      organizacion.id,
    );
    if (nombreDuplicado) {
      throw new UsuarioValidationError('Ya existe un usuario activo con ese nombre en la organización');
    }

    const usernameDuplicado = await this.usuarioRepository.existeUsername(username);
    if (usernameDuplicado) {
      throw new UsuarioValidationError('Ese nombre de usuario ya está en uso');
    }

    return this.usuarioRepository.crear({
      username,
      nombre,
      roleId: rolNuevo.id,
      organizacionId: organizacion.id,
      pin: input.pin,
    });
  }
}
