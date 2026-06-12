import { create } from 'zustand';

import type { PermissionService } from '@/features/auth/application/services/PermissionService';
import type { Rol } from '@/features/auth/domain/entities/Rol';
import type { Usuario } from '@/features/auth/domain/entities/Usuario';

import type { InventarioAggregate } from '@/features/configuracion/domain/entities/InventarioAggregate';
import type { IInventarioAggregateRepository } from '@/features/configuracion/domain/repositories/IInventarioAggregateRepository';
import { aggregateMapFromList } from '@/features/configuracion/presentation/utils/formatAggregateTotals';

import type { ObtenerEstructuraEclesial } from '../../application/use-cases/ObtenerEstructuraEclesial';
import type { EstructuraEclesial, OrganizacionNodo } from '../../application/dto/EstructuraEclesial';
import { flattenOrganizacionTree } from '../../application/services/OrganizacionTreeBuilder';

type OrganizacionesState = {
  estructura: EstructuraEclesial | null;
  capillas: OrganizacionNodo[];
  isLoading: boolean;
  errorMessage: string | null;
  selectedOrganizacionId: string | null;
  expandedIds: Record<string, boolean>;
  aggregatesByOrgId: Record<string, InventarioAggregate>;
  isLoadingAggregates: boolean;
};

type OrganizacionesActions = {
  cargarEstructura: (
    usuario: Usuario,
    rol: Rol,
    permissionService: PermissionService,
    useCase: ObtenerEstructuraEclesial,
  ) => Promise<void>;
  cargarAggregates: (
    repository: IInventarioAggregateRepository,
    nodos?: OrganizacionNodo[],
  ) => Promise<void>;
  toggleExpanded: (id: string) => void;
  setSelectedOrganizacionId: (id: string | null) => void;
  clearError: () => void;
  reset: () => void;
};

const initialState: OrganizacionesState = {
  estructura: null,
  capillas: [],
  isLoading: false,
  errorMessage: null,
  selectedOrganizacionId: null,
  expandedIds: {},
  aggregatesByOrgId: {},
  isLoadingAggregates: false,
};

function extractCapillas(nodos: OrganizacionNodo[]): OrganizacionNodo[] {
  return flattenOrganizacionTree(nodos).filter((nodo) => nodo.nivel.esHoja);
}

export const useOrganizacionesStore = create<OrganizacionesState & OrganizacionesActions>(
  (set, get) => ({
    ...initialState,

    cargarEstructura: async (usuario, rol, permissionService, useCase) => {
      set({ isLoading: true, errorMessage: null });

      try {
        const estructura = await useCase.execute(usuario, rol, permissionService);
        const capillas = extractCapillas(estructura.nodos);
        const expandedIds = Object.fromEntries(
          estructura.nodos.map((nodo) => [nodo.organizacion.id, true]),
        );

        set({
          estructura,
          capillas,
          expandedIds,
          isLoading: false,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error al cargar organizaciones';
        set({ isLoading: false, errorMessage: message });
      }
    },

    cargarAggregates: async (repository, nodos) => {
      const { estructura } = get();
      const arbol = nodos ?? (estructura ? flattenOrganizacionTree(estructura.nodos) : []);
      const orgIds = arbol.map((nodo) => nodo.organizacion.id);

      if (orgIds.length === 0) {
        set({ aggregatesByOrgId: {} });
        return;
      }

      set({ isLoadingAggregates: true });

      try {
        const aggregates = await repository.listarPorOrganizacionIds(orgIds);
        set({
          aggregatesByOrgId: aggregateMapFromList(aggregates),
          isLoadingAggregates: false,
        });
      } catch {
        set({ isLoadingAggregates: false });
      }
    },

    toggleExpanded: (id) => {
      const { expandedIds } = get();
      set({ expandedIds: { ...expandedIds, [id]: !expandedIds[id] } });
    },

    setSelectedOrganizacionId: (id) => set({ selectedOrganizacionId: id }),

    clearError: () => set({ errorMessage: null }),

    reset: () => set(initialState),
  }),
);
