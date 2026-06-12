import type { Rol } from '@/features/auth/domain/entities/Rol';
import type { Usuario } from '@/features/auth/domain/entities/Usuario';
import type { UserRoleCodigoValue } from '@/shared/infrastructure/database/schema';

import type { UsuarioListadoItem } from '../entities/UsuarioListadoItem';

export type CrearUsuarioLocalPersistInput = {
  readonly username: string;
  readonly nombre: string;
  readonly roleId: string;
  readonly organizacionId: string;
  readonly pin: string;
};

export interface IUsuarioLocalRepository {
  crear(input: CrearUsuarioLocalPersistInput): Promise<Usuario>;
  listarRolesPorCodigos(codigos: UserRoleCodigoValue[]): Promise<Rol[]>;
  existeNombreEnOrganizacion(nombre: string, organizacionId: string): Promise<boolean>;
  existeUsername(username: string): Promise<boolean>;
  listarEnOrganizaciones(organizacionIds: string[]): Promise<UsuarioListadoItem[]>;
}
