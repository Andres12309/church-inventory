import type { Organizacion } from '../entities/Organizacion';
import type { OrganizacionNivel } from '../entities/OrganizacionNivel';
import type { Ubicacion } from '../entities/Ubicacion';

export interface IOrganizacionRepository {
  obtenerPorId(id: string): Promise<Organizacion | null>;
  obtenerUbicacion(orgId: string): Promise<Ubicacion | null>;
  listarNiveles(): Promise<OrganizacionNivel[]>;
  listarHijosDirectos(parentId: string | null): Promise<Organizacion[]>;
  obtenerSubarbol(rootId: string): Promise<Organizacion[]>;
  guardar(organizacion: Organizacion, ubicacion?: Ubicacion): Promise<void>;
  eliminarLogico(id: string, deviceId: string, lamportClock: number): Promise<void>;
  obtenerNivelPorId(nivelId: string): Promise<OrganizacionNivel | null>;
}
