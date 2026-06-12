import { UserNotFoundError } from '../../domain/errors/UserNotFoundError';
import type { IUsuarioRepository } from '../../domain/repositories/IUsuarioRepository';
import type { AuthSession } from '../dto/AuthSession';

export class RestaurarSesion {
  constructor(private readonly usuarioRepository: IUsuarioRepository) {}

  async execute(usuarioId: string): Promise<AuthSession> {
    const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
    if (!usuario) {
      throw new UserNotFoundError(usuarioId);
    }

    const rol = await this.usuarioRepository.obtenerRolPorId(usuario.roleId);
    if (!rol) {
      throw new UserNotFoundError(usuarioId);
    }

    const modulos = await this.usuarioRepository.listarModulosPorRoleId(usuario.roleId);

    return { usuario, rol, modulos };
  }
}
