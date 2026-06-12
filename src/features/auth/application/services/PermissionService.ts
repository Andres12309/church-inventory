import type { Modulo } from '../../domain/entities/Modulo';
import type { Usuario } from '../../domain/entities/Usuario';
import type { ModuloCodigoValue } from '@/shared/infrastructure/database/schema';

export class PermissionService {
  constructor(
    private readonly usuario: Usuario,
    private readonly modulosPermitidos: Modulo[],
  ) {}

  getUsuario(): Usuario {
    return this.usuario;
  }

  getModulos(): Modulo[] {
    return this.modulosPermitidos;
  }

  tieneAcceso(codigoModulo: ModuloCodigoValue): boolean {
    return this.modulosPermitidos.some(
      (modulo) => modulo.activo && modulo.codigo === codigoModulo,
    );
  }

  getCodigosModulo(): ModuloCodigoValue[] {
    return this.modulosPermitidos.filter((m) => m.activo).map((m) => m.codigo);
  }
}
