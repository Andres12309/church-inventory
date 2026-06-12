import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { useAuthStore } from '@/features/auth/presentation/store/authStore';
import { BIENES_ROUTES } from '@/features/bienes/presentation/routes';
import { OFRENDAS_ROUTES } from '@/features/ofrendas/presentation/routes';
import { FinanzaNaturaleza } from '@/features/ofrendas/domain/entities/FinanzaNaturaleza';
import { ORGANIZACIONES_ROUTES } from '@/features/organizaciones/presentation/routes';
import { REPORTES_ROUTES } from '@/features/reportes/presentation/routes';
import { SYNC_ROUTES } from '@/features/sync/presentation/routes';
import { USUARIOS_ROUTES } from '@/features/usuarios/presentation/routes';
import { useDashboardStore } from '@/features/dashboard/presentation/store/dashboardStore';
import { createConsolidationService } from '@/shared/infrastructure/background/createConsolidationTrigger';
import { ModuloCodigo, UserRoleCodigo } from '@/shared/infrastructure/database/schema';

export type QuickActionItem = {
  id: string;
  icon: string;
  label: string;
  onPress: () => void;
};

export function useQuickActionsList() {
  const router = useRouter();
  const db = useSQLiteContext();

  const usuario = useAuthStore((s) => s.usuarioActual);
  const rol = useAuthStore((s) => s.rolActual);
  const tieneAcceso = useAuthStore((s) => s.tieneAcceso);

  const parroquiaId = useDashboardStore((s) => s.parroquiaId);
  const puedeCrearCapilla = useDashboardStore((s) => s.puedeAccionesRapidas);
  const aggregateOrgId = useDashboardStore((s) => s.aggregateOrgId);
  const isRecalculating = useDashboardStore((s) => s.isRecalculating);

  const orgId = usuario?.organizacionId ?? '';

  const recalcularTotales = useCallback(async () => {
    const targetOrgId = aggregateOrgId ?? orgId;
    if (!targetOrgId || !rol) {
      return;
    }

    const { setRecalculating, setError, bumpRefresh } = useDashboardStore.getState();
    setRecalculating(true);
    setError(null);

    try {
      const consolidationService = createConsolidationService(db);
      if (rol.codigo === UserRoleCodigo.SUPER_ADMIN) {
        await consolidationService.consolidarTodoElArbol();
      } else {
        await consolidationService.consolidarNodo(targetOrgId);
      }
      bumpRefresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo recalcular la caché de totales';
      setError(message);
    } finally {
      useDashboardStore.getState().setRecalculating(false);
    }
  }, [aggregateOrgId, db, orgId, rol]);

  const actions = useMemo((): QuickActionItem[] => {
    const items: QuickActionItem[] = [];

    if (tieneAcceso(ModuloCodigo.INVENTARIO_BIENES) && orgId) {
      items.push({
        id: 'nuevo-bien',
        icon: '📦',
        label: 'Registrar bien',
        onPress: () => router.push(BIENES_ROUTES.nuevo(orgId)),
      });
      items.push({
        id: 'inventario',
        icon: '📋',
        label: 'Ir a inventario',
        onPress: () => router.push(BIENES_ROUTES.listado(orgId)),
      });
    }

    if (tieneAcceso(ModuloCodigo.OFRENDAS) && orgId) {
      items.push({
        id: 'nuevo-ingreso',
        icon: '💰',
        label: 'Registrar ingreso',
        onPress: () => router.push(OFRENDAS_ROUTES.nuevo(orgId, FinanzaNaturaleza.INGRESO)),
      });
      items.push({
        id: 'nuevo-gasto',
        icon: '📤',
        label: 'Registrar gasto',
        onPress: () => router.push(OFRENDAS_ROUTES.nuevo(orgId, FinanzaNaturaleza.EGRESO)),
      });
      items.push({
        id: 'finanzas',
        icon: '📈',
        label: 'Ir a finanzas',
        onPress: () => router.push(OFRENDAS_ROUTES.dashboard(orgId)),
      });
    }

    if (puedeCrearCapilla && parroquiaId) {
      items.push({
        id: 'nueva-capilla',
        icon: '⛪',
        label: 'Nueva capilla',
        onPress: () => router.push(ORGANIZACIONES_ROUTES.nuevaCapilla(parroquiaId)),
      });
    }

    if (tieneAcceso(ModuloCodigo.USUARIOS)) {
      items.push({
        id: 'nuevo-usuario',
        icon: '👤',
        label: 'Registrar usuario',
        onPress: () => router.push(USUARIOS_ROUTES.nuevo),
      });
    }

    if (tieneAcceso(ModuloCodigo.ORGANIZACIONES)) {
      items.push({
        id: 'organizaciones',
        icon: '🏛️',
        label: 'Organizaciones',
        onPress: () => router.push(ORGANIZACIONES_ROUTES.dashboard),
      });
    }

    if (tieneAcceso(ModuloCodigo.REPORTES)) {
      items.push({
        id: 'reportes',
        icon: '📊',
        label: 'Reportes / Excel',
        onPress: () => router.push(REPORTES_ROUTES.listado),
      });
    }

    if (tieneAcceso(ModuloCodigo.SYNC)) {
      items.push({
        id: 'sync',
        icon: '↻',
        label: 'Sincronización P2P',
        onPress: () => router.push(SYNC_ROUTES.dashboard),
      });
    }

    items.push({
      id: 'recalcular',
      icon: '🧮',
      label: isRecalculating ? 'Recalculando…' : 'Recalcular totales',
      onPress: () => void recalcularTotales(),
    });

    return items;
  }, [
    isRecalculating,
    orgId,
    parroquiaId,
    puedeCrearCapilla,
    recalcularTotales,
    router,
    tieneAcceso,
  ]);

  return { actions, isRecalculating };
}
