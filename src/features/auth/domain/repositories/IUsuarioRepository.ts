import type { Modulo } from '../entities/Modulo';
import type { Rol } from '../entities/Rol';
import type { Usuario } from '../entities/Usuario';

export interface IUsuarioRepository {
  buscarPorId(id: string): Promise<Usuario | null>;
  buscarPorUsername(username: string): Promise<Usuario | null>;
  buscarPorOrganizacion(orgId: string): Promise<Usuario[]>;
  listarActivos(): Promise<Usuario[]>;
  verificarPin(usuarioId: string, pin: string): Promise<boolean>;
  crearUsuario(usuario: Usuario, pin: string): Promise<void>;
  obtenerRolPorId(roleId: string): Promise<Rol | null>;
  listarModulosPorRoleId(roleId: string): Promise<Modulo[]>;
  actualizarUltimoAcceso(usuarioId: string): Promise<void>;
  ensureDefaultAdmin(): Promise<void>;
  ensurePerfilesDemostracion(): Promise<void>;
}
