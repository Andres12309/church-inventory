import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { UsuarioListadoItem } from '@/features/usuarios/domain/entities/UsuarioListadoItem';
import type { Organizacion } from '@/features/organizaciones/domain/entities/Organizacion';
import { useTheme } from '@/hooks/use-theme';
import { AppCard } from '@/shared/presentation/ui/AppCard';
import { PrimaryButton } from '@/shared/presentation/ui/PrimaryButton';

import {
  ALL_SYNC_SEGMENTS,
  CHAPEL_HANDOVER_SEGMENTS,
  defaultSyncPlan,
  SYNC_SEGMENT_DEPENDENCIES,
  SYNC_SEGMENT_LABELS,
  type SyncPlan,
  type SyncSegmentIdValue,
} from '../../domain/entities/SyncPlan';

type SyncPackageSelectorProps = {
  organizaciones: Organizacion[];
  usuarios: UsuarioListadoItem[];
  plan: SyncPlan;
  pushOnly: boolean;
  onChange: (plan: SyncPlan) => void;
  onPushOnlyChange: (value: boolean) => void;
};

function toggleSegment(current: SyncSegmentIdValue[], segment: SyncSegmentIdValue): SyncSegmentIdValue[] {
  if (current.includes(segment)) {
    return current.filter((entry) => entry !== segment);
  }
  return [...current, segment];
}

export function SyncPackageSelector({
  organizaciones,
  usuarios,
  plan,
  pushOnly,
  onChange,
  onPushOnlyChange,
}: SyncPackageSelectorProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(plan.mode === 'segments');

  const selectedOrgLabel = useMemo(() => {
    if (!plan.orgIds?.length) {
      return 'Todo mi alcance';
    }
    const labels = plan.orgIds
      .map((id) => organizaciones.find((org) => org.id === id)?.nombre)
      .filter(Boolean);
    return labels.join(', ') || 'Organizaciones seleccionadas';
  }, [organizaciones, plan.orgIds]);

  const selectedUsersLabel = useMemo(() => {
    if (!plan.userIds?.length) {
      return 'Todos los usuarios del ámbito';
    }
    const labels = plan.userIds
      .map((id) => usuarios.find((user) => user.id === id)?.nombre)
      .filter(Boolean);
    return labels.join(', ') || 'Usuarios seleccionados';
  }, [plan.userIds, usuarios]);

  useEffect(() => {
    if (plan.mode === 'segments') {
      setExpanded(true);
    }
  }, [plan.mode]);

  const setModeAll = () => {
    onChange(defaultSyncPlan());
  };

  const setModeSegments = (segments: SyncSegmentIdValue[]) => {
    onChange({
      mode: 'segments',
      segments,
      orgIds: plan.orgIds,
      userIds: plan.userIds,
    });
  };

  const handleSegmentToggle = (segment: SyncSegmentIdValue) => {
    const current = plan.segments ?? [];
    const next = toggleSegment(current, segment);
    if (next.length === 0) {
      setModeAll();
      return;
    }
    setModeSegments(next);
  };

  const handleChapelPreset = () => {
    onChange({
      mode: 'segments',
      segments: CHAPEL_HANDOVER_SEGMENTS,
      orgIds: plan.orgIds,
      userIds: plan.userIds,
    });
    setExpanded(true);
  };

  const handleOrgSelect = (orgId: string) => {
    const current = plan.orgIds ?? [];
    const next = current.includes(orgId)
      ? current.filter((id) => id !== orgId)
      : [...current, orgId];
    onChange({
      ...plan,
      orgIds: next.length > 0 ? next : undefined,
    });
  };

  const handleUserSelect = (userId: string) => {
    const current = plan.userIds ?? [];
    const next = current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId];
    onChange({
      ...plan,
      userIds: next.length > 0 ? next : undefined,
    });
  };

  const activeSegments = plan.mode === 'all' ? ALL_SYNC_SEGMENTS : (plan.segments ?? []);

  return (
    <AppCard>
      <ThemedText type="smallBold">Paquete de sincronización</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Elige qué datos enviar. Las dependencias se incluyen automáticamente.
      </ThemedText>

      <View style={styles.rowBetween}>
        <ThemedText type="small">Sincronizar todo</ThemedText>
        <Switch
          value={plan.mode === 'all'}
          onValueChange={(value) => (value ? setModeAll() : setModeSegments([ALL_SYNC_SEGMENTS[0]]))}
          trackColor={{ false: theme.backgroundSelected, true: theme.primaryMuted }}
          thumbColor={plan.mode === 'all' ? theme.primary : theme.textSecondary}
        />
      </View>

      <PrimaryButton label="Paquete entrega de capilla" variant="secondary" onPress={handleChapelPreset} />

      <Pressable onPress={() => setExpanded((value) => !value)}>
        <ThemedText type="linkPrimary">
          {expanded ? 'Ocultar segmentos' : 'Configurar segmentos individuales'}
        </ThemedText>
      </Pressable>

      {expanded && plan.mode === 'segments' ? (
        <View style={styles.segmentList}>
          {ALL_SYNC_SEGMENTS.map((segment) => {
            const deps = SYNC_SEGMENT_DEPENDENCIES[segment];
            const selected = activeSegments.includes(segment);
            return (
              <Pressable
                key={segment}
                onPress={() => handleSegmentToggle(segment)}
                style={[
                  styles.segmentRow,
                  {
                    borderColor: selected ? theme.primary : theme.border,
                    backgroundColor: selected ? theme.primaryMuted : theme.background,
                  },
                ]}
              >
                <ThemedText type="smallBold">{SYNC_SEGMENT_LABELS[segment]}</ThemedText>
                {deps.length > 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    Requiere: {deps.map((dep) => SYNC_SEGMENT_LABELS[dep]).join(', ')}
                  </ThemedText>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <ThemedText type="smallBold">Ámbito organizacional</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {selectedOrgLabel}
      </ThemedText>
      <View style={styles.chipWrap}>
        {organizaciones.slice(0, 12).map((org) => {
          const selected = plan.orgIds?.includes(org.id) ?? false;
          return (
            <Pressable
              key={org.id}
              onPress={() => handleOrgSelect(org.id)}
              style={[
                styles.chip,
                {
                  borderColor: selected ? theme.primary : theme.border,
                  backgroundColor: selected ? theme.primaryMuted : theme.background,
                },
              ]}
            >
              <ThemedText type="small">{org.nombre}</ThemedText>
            </Pressable>
          );
        })}
      </View>

      {activeSegments.includes('usuarios') ? (
        <>
          <ThemedText type="smallBold">Usuarios específicos (opcional)</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {selectedUsersLabel}
          </ThemedText>
          <View style={styles.chipWrap}>
            {usuarios.slice(0, 16).map((user) => {
              const selected = plan.userIds?.includes(user.id) ?? false;
              return (
                <Pressable
                  key={user.id}
                  onPress={() => handleUserSelect(user.id)}
                  style={[
                    styles.chip,
                    {
                      borderColor: selected ? theme.primary : theme.border,
                      backgroundColor: selected ? theme.primaryMuted : theme.background,
                    },
                  ]}
                >
                  <ThemedText type="small">
                    {user.nombre} · {user.rolNombre}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      <View style={styles.rowBetween}>
        <View style={styles.flex}>
          <ThemedText type="smallBold">Solo enviar (no recibir)</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Ideal para configurar un dispositivo nuevo
          </ThemedText>
        </View>
        <Switch
          value={pushOnly}
          onValueChange={onPushOnlyChange}
          trackColor={{ false: theme.backgroundSelected, true: theme.primaryMuted }}
          thumbColor={pushOnly ? theme.primary : theme.textSecondary}
        />
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flex: { flex: 1 },
  segmentList: { gap: Spacing.two },
  segmentRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    padding: Spacing.two,
    gap: Spacing.one,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
});
