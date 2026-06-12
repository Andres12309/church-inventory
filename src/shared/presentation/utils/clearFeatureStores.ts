import { useBienesStore } from '@/features/bienes/presentation/store/bienesStore';
import { useDashboardStore } from '@/features/dashboard/presentation/store/dashboardStore';
import { useOfrendasStore } from '@/features/ofrendas/presentation/store/ofrendasStore';
import { useOrganizacionesStore } from '@/features/organizaciones/presentation/store/organizacionesStore';
import { useSyncStore } from '@/features/sync/presentation/store/syncStore';

export function clearFeatureStores(): void {
  useOrganizacionesStore.getState().reset();
  useBienesStore.getState().reset();
  useOfrendasStore.getState().reset();
  useSyncStore.getState().resetRuntime();
  useDashboardStore.getState().reset();
}
