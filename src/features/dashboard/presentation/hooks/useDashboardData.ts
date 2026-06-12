import { useCallback, useEffect, useMemo } from 'react';
import { usePathname } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { useAuthStore } from '@/features/auth/presentation/store/authStore';
import { useAuthUseCases } from '@/features/auth/presentation/hooks/useAuthUseCases';
import { useInventarioAggregateRepository } from '@/features/configuracion/presentation/hooks/useInventarioAggregateRepository';
import { SqliteOrganizacionRepository } from '@/features/organizaciones/infrastructure/SqliteOrganizacionRepository';
import { createConsolidationService } from '@/shared/infrastructure/background/createConsolidationTrigger';
import { runSerializedSqlite, withSqliteLockRetry } from '@/shared/infrastructure/database/sqliteRetry';
import { UserRoleCodigo } from '@/shared/infrastructure/database/schema';

import { resolverAlcanceDashboard } from '../../application/services/DashboardScopeResolver';
import {
  extraerBienesMalEstado,
  useDashboardStore,
} from '../store/dashboardStore';

export function useDashboardData() {
  const db = useSQLiteContext();
  const aggregateRepository = useInventarioAggregateRepository();
  const { repository } = useAuthUseCases();

  const pathname = usePathname();
  const usuarioActual = useAuthStore((state) => state.usuarioActual);
  const rolActual = useAuthStore((state) => state.rolActual);
  const refreshKey = useDashboardStore((state) => state.refreshKey);
  const isLoading = useDashboardStore((state) => state.isLoading);
  const isRecalculating = useDashboardStore((state) => state.isRecalculating);
  const errorMessage = useDashboardStore((state) => state.errorMessage);
  const scopeLabel = useDashboardStore((state) => state.scopeLabel);
  const parroquiaId = useDashboardStore((state) => state.parroquiaId);
  const puedeAccionesRapidas = useDashboardStore((state) => state.puedeAccionesRapidas);
  const totalBienes = useDashboardStore((state) => state.totalBienes);
  const totalOfrendas = useDashboardStore((state) => state.totalOfrendas);
  const bienesMalEstado = useDashboardStore((state) => state.bienesMalEstado);
  const cacheEmpty = useDashboardStore((state) => state.cacheEmpty);
  const cacheCalculatedAt = useDashboardStore((state) => state.cacheCalculatedAt);
  const aggregateOrgId = useDashboardStore((state) => state.aggregateOrgId);

  const orgRepository = useMemo(() => new SqliteOrganizacionRepository(db), [db]);
  const consolidationService = useMemo(() => createConsolidationService(db), [db]);

  const cargarDashboard = useCallback(async () => {
    if (!usuarioActual || !rolActual) {
      return;
    }

    const { setLoading, setError, applySnapshot } = useDashboardStore.getState();
    setLoading(true);
    setError(null);

    try {
      const snapshot = await runSerializedSqlite(() =>
        withSqliteLockRetry(async () => {
          await repository.ensurePerfilesDemostracion();

          const scope = await resolverAlcanceDashboard(usuarioActual, rolActual, orgRepository);
          const aggregate = await aggregateRepository.obtenerPorOrganizacionId(scope.aggregateOrgId);

          return {
            scopeLabel: scope.scopeLabel,
            aggregateOrgId: scope.aggregateOrgId,
            parroquiaId: scope.parroquiaId,
            puedeAccionesRapidas: scope.puedeAccionesRapidas,
            totalBienes: aggregate?.totalBienes ?? 0,
            totalOfrendas: aggregate?.totalOfrendas ?? 0,
            bienesMalEstado: extraerBienesMalEstado(aggregate?.totalBienesPorEstado),
            cacheEmpty: aggregate === null,
            cacheCalculatedAt: aggregate?.calculadoAt ?? null,
          };
        }),
      );
      applySnapshot(snapshot);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudieron cargar los totales del dashboard';
      setError(message);
      useDashboardStore.getState().setLoading(false);
    }
  }, [aggregateRepository, orgRepository, repository, rolActual, usuarioActual]);

  const forzarRecalculo = useCallback(async () => {
    const orgId = aggregateOrgId ?? usuarioActual?.organizacionId;
    if (!orgId || !rolActual) {
      return;
    }

    const { setRecalculating, setError } = useDashboardStore.getState();
    setRecalculating(true);
    setError(null);

    try {
      if (rolActual.codigo === UserRoleCodigo.SUPER_ADMIN) {
        await consolidationService.consolidarTodoElArbol();
      } else {
        await consolidationService.consolidarNodo(orgId);
      }
      await cargarDashboard();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo recalcular la caché de totales';
      setError(message);
    } finally {
      useDashboardStore.getState().setRecalculating(false);
    }
  }, [aggregateOrgId, cargarDashboard, consolidationService, rolActual, usuarioActual?.organizacionId]);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      if (!usuarioActual || !rolActual) {
        return;
      }

      const { setLoading, setError, applySnapshot } = useDashboardStore.getState();
      setLoading(true);
      setError(null);

      try {
        const snapshot = await runSerializedSqlite(() =>
          withSqliteLockRetry(async () => {
            await repository.ensurePerfilesDemostracion();

            const scope = await resolverAlcanceDashboard(usuarioActual, rolActual, orgRepository);
            const aggregate = await aggregateRepository.obtenerPorOrganizacionId(scope.aggregateOrgId);

            return {
              scopeLabel: scope.scopeLabel,
              aggregateOrgId: scope.aggregateOrgId,
              parroquiaId: scope.parroquiaId,
              puedeAccionesRapidas: scope.puedeAccionesRapidas,
              totalBienes: aggregate?.totalBienes ?? 0,
              totalOfrendas: aggregate?.totalOfrendas ?? 0,
              bienesMalEstado: extraerBienesMalEstado(aggregate?.totalBienesPorEstado),
              cacheEmpty: aggregate === null,
              cacheCalculatedAt: aggregate?.calculadoAt ?? null,
            };
          }),
        );

        if (!mounted) {
          return;
        }

        applySnapshot(snapshot);
      } catch (error) {
        if (!mounted) {
          return;
        }
        const message =
          error instanceof Error ? error.message : 'No se pudieron cargar los totales del dashboard';
        setError(message);
        useDashboardStore.getState().setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [aggregateRepository, orgRepository, repository, refreshKey, pathname, rolActual, usuarioActual]);

  return {
    usuarioActual,
    rolActual,
    isLoading,
    isRecalculating,
    errorMessage,
    scopeLabel,
    parroquiaId,
    puedeAccionesRapidas,
    totalBienes,
    totalOfrendas,
    bienesMalEstado,
    cacheEmpty,
    cacheCalculatedAt,
    forzarRecalculo,
    recargar: cargarDashboard,
  };
}
