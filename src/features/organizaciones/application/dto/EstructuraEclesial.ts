import type { Organizacion } from '../../domain/entities/Organizacion';
import type { OrganizacionNivel } from '../../domain/entities/OrganizacionNivel';
import type { Ubicacion } from '../../domain/entities/Ubicacion';

export type OrganizacionNodo = {
  organizacion: Organizacion;
  nivel: OrganizacionNivel;
  ubicacion: Ubicacion | null;
  hijos: OrganizacionNodo[];
};

export type EstructuraEclesial = {
  nodos: OrganizacionNodo[];
  niveles: OrganizacionNivel[];
  puedeAdministrar: boolean;
  alcanceRootId: string | null;
};

export type GuardarOrganizacionInput = {
  id?: string;
  nivelId: string;
  parentId: string | null;
  nombre: string;
  codigoInterno?: string;
  descripcion?: string | null;
  activo?: boolean;
  ubicacion?: {
    id?: string;
    direccion: string;
    ciudad?: string | null;
    provincia?: string | null;
    pais?: string;
    latitud?: number | null;
    longitud?: number | null;
  };
};
