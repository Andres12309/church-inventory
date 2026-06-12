import { create } from 'zustand';

import { BienEstado } from '@/shared/infrastructure/database/schema';

export type DashboardSnapshot = {
  scopeLabel: string;
  aggregateOrgId: string | null;
  parroquiaId: string | null;
  puedeAccionesRapidas: boolean;
  totalBienes: number;
  totalOfrendas: number;
  bienesMalEstado: number;
  cacheEmpty: boolean;
  cacheCalculatedAt: string | null;
};

type DashboardState = DashboardSnapshot & {
  isLoading: boolean;
  isRecalculating: boolean;
  errorMessage: string | null;
  refreshKey: number;
};

type DashboardActions = {
  setLoading: (isLoading: boolean) => void;
  setRecalculating: (isRecalculating: boolean) => void;
  setError: (message: string | null) => void;
  applySnapshot: (snapshot: DashboardSnapshot) => void;
  bumpRefresh: () => void;
  reset: () => void;
};

const initialSnapshot: DashboardSnapshot = {
  scopeLabel: '',
  aggregateOrgId: null,
  parroquiaId: null,
  puedeAccionesRapidas: false,
  totalBienes: 0,
  totalOfrendas: 0,
  bienesMalEstado: 0,
  cacheEmpty: true,
  cacheCalculatedAt: null,
};

const initialState: DashboardState = {
  ...initialSnapshot,
  isLoading: false,
  isRecalculating: false,
  errorMessage: null,
  refreshKey: 0,
};

export const useDashboardStore = create<DashboardState & DashboardActions>((set) => ({
  ...initialState,

  setLoading: (isLoading) => set({ isLoading }),
  setRecalculating: (isRecalculating) => set({ isRecalculating }),
  setError: (errorMessage) => set({ errorMessage }),

  applySnapshot: (snapshot) =>
    set({
      ...snapshot,
      isLoading: false,
      errorMessage: null,
    }),

  bumpRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),

  reset: () => set({ ...initialState }),
}));

export function extraerBienesMalEstado(
  porEstado: Partial<Record<string, number>> | undefined,
): number {
  return porEstado?.[BienEstado.MALO] ?? 0;
}
