import { InvalidPinError } from '../../domain/errors/InvalidPinError';
import { UserNotFoundError } from '../../domain/errors/UserNotFoundError';
import type { IUsuarioRepository } from '../../domain/repositories/IUsuarioRepository';
import type { AuthSession } from '../dto/AuthSession';

export class AutenticarConPin {
  constructor(private readonly usuarioRepository: IUsuarioRepository) {}

  async execute(username: string, pin: string): Promise<AuthSession> {
    const normalizedUsername = username.trim();
    if (!normalizedUsername) {
      throw new UserNotFoundError(normalizedUsername);
    }

    const usuario = await this.usuarioRepository.buscarPorUsername(normalizedUsername);
    if (!usuario) {
      throw new UserNotFoundError(normalizedUsername);
    }

    const pinValido = await this.usuarioRepository.verificarPin(usuario.id, pin);
    if (!pinValido) {
      throw new InvalidPinError();
    }

    const rol = await this.usuarioRepository.obtenerRolPorId(usuario.roleId);
    if (!rol) {
      throw new UserNotFoundError(normalizedUsername);
    }

    const modulos = await this.usuarioRepository.listarModulosPorRoleId(usuario.roleId);
    await this.usuarioRepository.actualizarUltimoAcceso(usuario.id);

    return { usuario, rol, modulos };
  }
}
