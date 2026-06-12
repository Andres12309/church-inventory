import { create } from 'zustand';

import type { PermissionService } from '@/features/auth/application/services/PermissionService';
import type { Rol } from '@/features/auth/domain/entities/Rol';
import type { Usuario } from '@/features/auth/domain/entities/Usuario';

import {
  obtenerFechaHoyIso,
  obtenerInicioMesIso,
} from '../../application/services/OfrendaAccessPolicy';
import type { RegistrarRecaudacionInput } from '../../application/dto/RegistrarRecaudacionInput';
import type { ConsultarFinanzas } from '../../application/use-cases/ConsultarFinanzas';
import type { GestionarTipoActividad } from '../../application/use-cases/GestionarTipoActividad';
import type { RegistrarRecaudacion } from '../../application/use-cases/RegistrarRecaudacion';
import type { Ofrenda } from '../../domain/entities/Ofrenda';
import type { TipoActividad } from '../../domain/entities/TipoActividad';
import { redondearMonto } from '../../infrastructure/OfrendaMapper';

export type OfrendaFormState = {
  id?: string;
  organizacionId: string;
  tipoActividadId: string;
  monto: string;
  fecha: string;
  descripcion: string;
};

export type TotalesPorTipo = {
  tipoActividadId: string;
  total: number;
};

type OfrendasState = {
  organizacionId: string | null;
  ofrendas: Ofrenda[];
  tiposActividad: TipoActividad[];
  fechaInicio: string;
  fechaFin: string;
  filtroTipoActividadId: string | null;
  totalRecaudado: number;
  totalesPorTipo: TotalesPorTipo[];
  formulario: OfrendaFormState | null;
  isLoading: boolean;
  isSaving: boolean;
  errorMessage: string | null;
};

type OfrendasActions = {
  setOrganizacionId: (id: string | null) => void;
  setFechaInicio: (fecha: string) => void;
  setFechaFin: (fecha: string) => void;
  setFiltroTipoActividadId: (id: string | null) => void;
  cargarCatalogo: (
    permissionService: PermissionService,
    consultarFinanzas: ConsultarFinanzas,
  ) => Promise<void>;
  crearTipoActividad: (
    nombre: string,
    permissionService: PermissionService,
    gestionarTipoActividad: GestionarTipoActividad,
  ) => Promise<TipoActividad>;
  cargarRecaudaciones: (
    usuario: Usuario,
    rol: Rol,
    permissionService: PermissionService,
    consultarFinanzas: ConsultarFinanzas,
  ) => Promise<void>;
  iniciarFormulario: (organizacionId: string, ofrenda?: Ofrenda) => void;
  actualizarFormulario: (partial: Partial<OfrendaFormState>) => void;
  guardarFormulario: (
    usuario: Usuario,
    rol: Rol,
    permissionService: PermissionService,
    registrarRecaudacion: RegistrarRecaudacion,
  ) => Promise<Ofrenda>;
  eliminarOfrenda: (
    id: string,
    usuario: Usuario,
    rol: Rol,
    permissionService: PermissionService,
    registrarRecaudacion: RegistrarRecaudacion,
  ) => Promise<void>;
  clearError: () => void;
  reset: () => void;
};

function calcularTotales(
  ofrendas: Ofrenda[],
  tiposActividad: TipoActividad[],
): { totalRecaudado: number; totalesPorTipo: TotalesPorTipo[] } {
  const acumulado = new Map<string, number>();
  let totalRecaudado = 0;

  for (const ofrenda of ofrendas) {
    totalRecaudado = redondearMonto(totalRecaudado + ofrenda.monto);
    const prev = acumulado.get(ofrenda.tipoActividadId) ?? 0;
    acumulado.set(ofrenda.tipoActividadId, redondearMonto(prev + ofrenda.monto));
  }

  const totalesPorTipo = tiposActividad
    .map((tipo) => ({
      tipoActividadId: tipo.id,
      total: acumulado.get(tipo.id) ?? 0,
    }))
    .filter((item) => item.total > 0);

  return { totalRecaudado, totalesPorTipo };
}

function toFormState(organizacionId: string, ofrenda?: Ofrenda): OfrendaFormState {
  return {
    id: ofrenda?.id,
    organizacionId,
    tipoActividadId: ofrenda?.tipoActividadId ?? '',
    monto: ofrenda ? ofrenda.monto.toFixed(2) : '',
    fecha: ofrenda?.fecha ?? obtenerFechaHoyIso(),
    descripcion: ofrenda?.descripcion ?? '',
  };
}

function toRegistrarInput(form: OfrendaFormState): RegistrarRecaudacionInput {
  return {
    id: form.id,
    organizacionId: form.organizacionId,
    tipoActividadId: form.tipoActividadId,
    monto: Number.parseFloat(form.monto.replace(',', '.')),
    fecha: form.fecha,
    descripcion: form.descripcion || null,
  };
}

const initialState: OfrendasState = {
  organizacionId: null,
  ofrendas: [],
  tiposActividad: [],
  fechaInicio: obtenerInicioMesIso(),
  fechaFin: obtenerFechaHoyIso(),
  filtroTipoActividadId: null,
  totalRecaudado: 0,
  totalesPorTipo: [],
  formulario: null,
  isLoading: false,
  isSaving: false,
  errorMessage: null,
};

export const useOfrendasStore = create<OfrendasState & OfrendasActions>((set, get) => ({
  ...initialState,

  setOrganizacionId: (id) => set({ organizacionId: id }),

  setFechaInicio: (fecha) => set({ fechaInicio: fecha }),

  setFechaFin: (fecha) => set({ fechaFin: fecha }),

  setFiltroTipoActividadId: (id) => set({ filtroTipoActividadId: id }),

  cargarCatalogo: async (permissionService, consultarFinanzas) => {
    try {
      const tiposActividad = await consultarFinanzas.listarTiposActividad(permissionService);
      set({ tiposActividad, errorMessage: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al cargar tipos de actividad';
      set({ errorMessage: message });
    }
  },

  crearTipoActividad: async (nombre, permissionService, gestionarTipoActividad) => {
    set({ errorMessage: null });
    try {
      const tipo = await gestionarTipoActividad.crear({ nombre }, permissionService);
      set((state) => ({
        tiposActividad: [...state.tiposActividad, tipo].sort((a, b) =>
          a.nombre.localeCompare(b.nombre, 'es'),
        ),
      }));
      return tipo;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear el tipo';
      set({ errorMessage: message });
      throw error;
    }
  },

  cargarRecaudaciones: async (usuario, rol, permissionService, consultarFinanzas) => {
    const { organizacionId, fechaInicio, fechaFin, filtroTipoActividadId, tiposActividad } =
      get();

    if (!organizacionId) {
      set({
        ofrendas: [],
        totalRecaudado: 0,
        totalesPorTipo: [],
        errorMessage: 'Selecciona una organización para consultar recaudaciones',
      });
      return;
    }

    set({ isLoading: true, errorMessage: null });

    try {
      const ofrendas = await consultarFinanzas.listarRecaudaciones(
        organizacionId,
        usuario,
        rol,
        permissionService,
        {
          fechaInicio,
          fechaFin,
          tipoActividadId: filtroTipoActividadId ?? undefined,
        },
      );

      const { totalRecaudado, totalesPorTipo } = calcularTotales(ofrendas, tiposActividad);
      set({ ofrendas, totalRecaudado, totalesPorTipo, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al cargar recaudaciones';
      set({
        isLoading: false,
        errorMessage: message,
        ofrendas: [],
        totalRecaudado: 0,
        totalesPorTipo: [],
      });
    }
  },

  iniciarFormulario: (organizacionId, ofrenda) => {
    set({ formulario: toFormState(organizacionId, ofrenda), errorMessage: null });
  },

  actualizarFormulario: (partial) => {
    const { formulario } = get();
    if (!formulario) {
      return;
    }
    set({ formulario: { ...formulario, ...partial }, errorMessage: null });
  },

  guardarFormulario: async (usuario, rol, permissionService, registrarRecaudacion) => {
    const { formulario } = get();
    if (!formulario) {
      throw new Error('No hay formulario activo');
    }

    set({ isSaving: true, errorMessage: null });

    try {
      const ofrenda = await registrarRecaudacion.guardar(
        toRegistrarInput(formulario),
        usuario,
        rol,
        permissionService,
      );
      set({ isSaving: false, formulario: null });
      return ofrenda;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al guardar la recaudación';
      set({ isSaving: false, errorMessage: message });
      throw error;
    }
  },

  eliminarOfrenda: async (id, usuario, rol, permissionService, registrarRecaudacion) => {
    set({ isSaving: true, errorMessage: null });

    try {
      await registrarRecaudacion.eliminar(id, usuario, rol, permissionService);
      set((state) => {
        const ofrendas = state.ofrendas.filter((o) => o.id !== id);
        const { totalRecaudado, totalesPorTipo } = calcularTotales(
          ofrendas,
          state.tiposActividad,
        );
        return { ofrendas, totalRecaudado, totalesPorTipo, isSaving: false };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al eliminar la recaudación';
      set({ isSaving: false, errorMessage: message });
      throw error;
    }
  },

  clearError: () => set({ errorMessage: null }),

  reset: () => set(initialState),
}));

export function formatearMonto(monto: number): string {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(monto);
}
