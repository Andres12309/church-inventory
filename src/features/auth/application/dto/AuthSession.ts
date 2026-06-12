import type { Modulo } from '../../domain/entities/Modulo';
import type { Rol } from '../../domain/entities/Rol';
import type { Usuario } from '../../domain/entities/Usuario';

export type AuthSession = {
  usuario: Usuario;
  rol: Rol;
  modulos: Modulo[];
};
