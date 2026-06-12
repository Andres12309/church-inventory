import { create } from 'zustand';

import { PermissionService } from '../../application/services/PermissionService';
import type { AuthSession } from '../../application/dto/AuthSession';
import type { Modulo } from '../../domain/entities/Modulo';
import type { Rol } from '../../domain/entities/Rol';
import type { Usuario } from '../../domain/entities/Usuario';
import {
  clearSessionUsuarioId,
  getSessionUsuarioId,
  saveSessionUsuarioId,
} from '../../infrastructure/SessionStorage';
import { saveRememberedUsername } from '../../infrastructure/RememberedUsernamesStorage';
import { useDashboardStore } from '@/features/dashboard/presentation/store/dashboardStore';
import { clearFeatureStores } from '@/shared/presentation/utils/clearFeatureStores';

import { AutenticarConPin } from '../../application/use-cases/AutenticarConPin';
import { RestaurarSesion } from '../../application/use-cases/RestaurarSesion';
import type { IUsuarioRepository } from '../../domain/repositories/IUsuarioRepository';
import type { ModuloCodigoValue } from '@/shared/infrastructure/database/schema';

type AuthState = {
  usuarioActual: Usuario | null;
  rolActual: Rol | null;
  modulosPermitidos: Modulo[];
  permissionService: PermissionService | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  welcomePending: boolean;
};

type AuthActions = {
  hydrateSession: (repository: IUsuarioRepository, restaurarSesion: RestaurarSesion) => Promise<void>;
  login: (
    username: string,
    pin: string,
    rememberMe: boolean,
    autenticarConPin: AutenticarConPin,
  ) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  completeWelcome: () => void;
  tieneAcceso: (codigo: ModuloCodigoValue) => boolean;
  simularPerfil: (
    usuarioId: string,
    restaurarSesion: RestaurarSesion,
    repository: IUsuarioRepository,
  ) => Promise<void>;
};

function applySession(session: AuthSession): Pick<
  AuthState,
  'usuarioActual' | 'rolActual' | 'modulosPermitidos' | 'permissionService' | 'isAuthenticated'
> {
  const permissionService = new PermissionService(session.usuario, session.modulos);

  return {
    usuarioActual: session.usuario,
    rolActual: session.rol,
    modulosPermitidos: session.modulos,
    permissionService,
    isAuthenticated: true,
  };
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  usuarioActual: null,
  rolActual: null,
  modulosPermitidos: [],
  permissionService: null,
  isAuthenticated: false,
  isHydrating: true,
  isLoading: false,
  errorMessage: null,
  welcomePending: false,

  hydrateSession: async (repository, restaurarSesion) => {
    set({ isHydrating: true, errorMessage: null, welcomePending: false });

    try {
      await repository.ensureDefaultAdmin();

      const storedUsuarioId = await getSessionUsuarioId();
      if (!storedUsuarioId) {
        set({ isHydrating: false, isAuthenticated: false, welcomePending: false });
        return;
      }

      const session = await restaurarSesion.execute(storedUsuarioId);
      set({
        ...applySession(session),
        isHydrating: false,
        errorMessage: null,
        welcomePending: true,
      });
    } catch {
      await clearSessionUsuarioId();
      set({
        usuarioActual: null,
        rolActual: null,
        modulosPermitidos: [],
        permissionService: null,
        isAuthenticated: false,
        isHydrating: false,
        errorMessage: null,
        welcomePending: false,
      });
    }
  },

  login: async (username, pin, rememberMe, autenticarConPin) => {
    set({ isLoading: true, errorMessage: null });

    try {
      const session = await autenticarConPin.execute(username, pin);
      await saveSessionUsuarioId(session.usuario.id);

      if (rememberMe) {
        await saveRememberedUsername(username.trim());
      }

      set({
        ...applySession(session),
        isLoading: false,
        isHydrating: false,
        errorMessage: null,
        welcomePending: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al iniciar sesión';
      set({ isLoading: false, errorMessage: message });
      throw error;
    }
  },

  logout: async () => {
    await clearSessionUsuarioId();
    set({
      usuarioActual: null,
      rolActual: null,
      modulosPermitidos: [],
      permissionService: null,
      isAuthenticated: false,
      isLoading: false,
      errorMessage: null,
      welcomePending: false,
    });
  },

  clearError: () => set({ errorMessage: null }),

  completeWelcome: () => set({ welcomePending: false }),

  tieneAcceso: (codigo) => {
    const { permissionService } = get();
    return permissionService?.tieneAcceso(codigo) ?? false;
  },

  simularPerfil: async (usuarioId, restaurarSesion, repository) => {
    set({
      isLoading: true,
      errorMessage: null,
      modulosPermitidos: [],
      permissionService: null,
    });

    try {
      await repository.ensurePerfilesDemostracion();
      const session = await restaurarSesion.execute(usuarioId);
      await saveSessionUsuarioId(session.usuario.id);
      clearFeatureStores();
      set({
        ...applySession(session),
        isLoading: false,
        isHydrating: false,
        errorMessage: null,
        welcomePending: false,
      });
      useDashboardStore.getState().bumpRefresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cambiar el perfil';
      set({ isLoading: false, errorMessage: message });
      throw error;
    }
  },
}));
