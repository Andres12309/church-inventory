import { create } from 'zustand';

import type { PermissionService } from '@/features/auth/application/services/PermissionService';
import type { Rol } from '@/features/auth/domain/entities/Rol';
import type { Usuario } from '@/features/auth/domain/entities/Usuario';
import type { BienEstadoValue } from '@/shared/infrastructure/database/schema';

import type { GestionarBienInput } from '../../application/dto/GestionarBienInput';
import type { ConsultarInventario } from '../../application/use-cases/ConsultarInventario';
import type { GestionarBien } from '../../application/use-cases/GestionarBien';
import type { Bien } from '../../domain/entities/Bien';
import type { CategoriaBien } from '../../domain/entities/CategoriaBien';

export type BienFormState = {
  id?: string;
  organizacionId: string;
  categoriaId: string;
  nombre: string;
  descripcion: string;
  estado: BienEstadoValue;
  cantidad: number;
  valorEstimado: string;
  observaciones: string;
  fotoUri: string | null;
  nuevaFotoTempUri: string | null;
  eliminarFoto: boolean;
};

type BienesState = {
  organizacionId: string | null;
  bienes: Bien[];
  categorias: CategoriaBien[];
  busqueda: string;
  filtroCategoriaId: string | null;
  filtroEstado: BienEstadoValue | null;
  formulario: BienFormState | null;
  isLoading: boolean;
  isSaving: boolean;
  errorMessage: string | null;
};

type BienesActions = {
  setOrganizacionId: (id: string | null) => void;
  setBusqueda: (texto: string) => void;
  setFiltroCategoriaId: (id: string | null) => void;
  setFiltroEstado: (estado: BienEstadoValue | null) => void;
  cargarCatalogo: (
    permissionService: PermissionService,
    consultarInventario: ConsultarInventario,
  ) => Promise<void>;
  cargarInventario: (
    usuario: Usuario,
    rol: Rol,
    permissionService: PermissionService,
    consultarInventario: ConsultarInventario,
  ) => Promise<void>;
  iniciarFormulario: (organizacionId: string, bien?: Bien) => void;
  actualizarFormulario: (partial: Partial<BienFormState>) => void;
  guardarFormulario: (
    usuario: Usuario,
    rol: Rol,
    permissionService: PermissionService,
    gestionarBien: GestionarBien,
  ) => Promise<Bien>;
  eliminarBien: (
    id: string,
    usuario: Usuario,
    rol: Rol,
    permissionService: PermissionService,
    gestionarBien: GestionarBien,
  ) => Promise<void>;
  clearError: () => void;
  reset: () => void;
};

const initialState: BienesState = {
  organizacionId: null,
  bienes: [],
  categorias: [],
  busqueda: '',
  filtroCategoriaId: null,
  filtroEstado: null,
  formulario: null,
  isLoading: false,
  isSaving: false,
  errorMessage: null,
};

function toFormState(organizacionId: string, bien?: Bien): BienFormState {
  return {
    id: bien?.id,
    organizacionId,
    categoriaId: bien?.categoriaId ?? '',
    nombre: bien?.nombre ?? '',
    descripcion: bien?.descripcion ?? '',
    estado: bien?.estado ?? 'bueno',
    cantidad: bien?.cantidad ?? 1,
    valorEstimado: bien?.valorEstimado != null ? String(bien.valorEstimado) : '',
    observaciones: bien?.observaciones ?? '',
    fotoUri: bien?.fotoUri ?? null,
    nuevaFotoTempUri: null,
    eliminarFoto: false,
  };
}

function toGestionarInput(form: BienFormState): GestionarBienInput {
  const valor = form.valorEstimado.trim();
  return {
    id: form.id,
    organizacionId: form.organizacionId,
    categoriaId: form.categoriaId,
    nombre: form.nombre,
    descripcion: form.descripcion || null,
    estado: form.estado,
    cantidad: form.cantidad,
    valorEstimado: valor ? Number.parseFloat(valor) : null,
    observaciones: form.observaciones || null,
    fotoUri: form.fotoUri,
    nuevaFotoTempUri: form.nuevaFotoTempUri,
    eliminarFoto: form.eliminarFoto,
  };
}

export const useBienesStore = create<BienesState & BienesActions>((set, get) => ({
  ...initialState,

  setOrganizacionId: (id) => set({ organizacionId: id }),

  setBusqueda: (texto) => set({ busqueda: texto }),

  setFiltroCategoriaId: (id) => set({ filtroCategoriaId: id }),

  setFiltroEstado: (estado) => set({ filtroEstado: estado }),

  cargarCatalogo: async (permissionService, consultarInventario) => {
    try {
      const categorias = await consultarInventario.listarCategorias(permissionService);
      set({ categorias });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al cargar categorías';
      set({ errorMessage: message });
    }
  },

  cargarInventario: async (usuario, rol, permissionService, consultarInventario) => {
    const { organizacionId, busqueda, filtroCategoriaId, filtroEstado } = get();

    if (!organizacionId) {
      set({ bienes: [], errorMessage: 'Selecciona una capilla para ver el inventario' });
      return;
    }

    set({ isLoading: true, errorMessage: null });

    try {
      const bienes = await consultarInventario.listarBienes(
        organizacionId,
        usuario,
        rol,
        permissionService,
        {
          busqueda: busqueda || undefined,
          categoriaId: filtroCategoriaId ?? undefined,
          estado: filtroEstado ?? undefined,
        },
      );

      set({ bienes, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al cargar inventario';
      set({ isLoading: false, errorMessage: message });
    }
  },

  iniciarFormulario: (organizacionId, bien) => {
    set({ formulario: toFormState(organizacionId, bien), errorMessage: null });
  },

  actualizarFormulario: (partial) => {
    const { formulario } = get();
    if (!formulario) {
      return;
    }
    set({ formulario: { ...formulario, ...partial }, errorMessage: null });
  },

  guardarFormulario: async (usuario, rol, permissionService, gestionarBien) => {
    const { formulario } = get();
    if (!formulario) {
      throw new Error('No hay formulario activo');
    }

    set({ isSaving: true, errorMessage: null });

    try {
      const bien = await gestionarBien.guardar(
        toGestionarInput(formulario),
        usuario,
        rol,
        permissionService,
      );
      set({ isSaving: false, formulario: null });
      return bien;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al guardar el bien';
      set({ isSaving: false, errorMessage: message });
      throw error;
    }
  },

  eliminarBien: async (id, usuario, rol, permissionService, gestionarBien) => {
    set({ isSaving: true, errorMessage: null });

    try {
      await gestionarBien.eliminar(id, usuario, rol, permissionService);
      set((state) => ({
        bienes: state.bienes.filter((b) => b.id !== id),
        isSaving: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al eliminar el bien';
      set({ isSaving: false, errorMessage: message });
      throw error;
    }
  },

  clearError: () => set({ errorMessage: null }),

  reset: () => set(initialState),
}));
