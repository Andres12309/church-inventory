import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuthStore } from '@/features/auth/presentation/store/authStore';
import { FinanzaNaturaleza } from '@/features/ofrendas/domain/entities/FinanzaNaturaleza';
import { OFRENDAS_ROUTES } from '@/features/ofrendas/presentation/routes';
import { ModuloCodigo } from '@/shared/infrastructure/database/schema';
import { PremiumPalette, PremiumShadow } from '@/shared/presentation/ui/premiumPalette';

type FinanzaAction = {
  href: ReturnType<typeof OFRENDAS_ROUTES.nuevo>;
  icon: string;
  label: string;
  variant: 'ingreso' | 'gasto';
};

export function DashboardFinanzasQuickActions() {
  const router = useRouter();
  const usuario = useAuthStore((s) => s.usuarioActual);
  const tieneAcceso = useAuthStore((s) => s.tieneAcceso(ModuloCodigo.OFRENDAS));

  const orgId = usuario?.organizacionId;
  if (!tieneAcceso || !orgId) {
    return null;
  }

  const actions: FinanzaAction[] = [
    {
      href: OFRENDAS_ROUTES.nuevo(orgId, FinanzaNaturaleza.INGRESO),
      icon: '💰',
      label: 'Registrar ingreso',
      variant: 'ingreso',
    },
    {
      href: OFRENDAS_ROUTES.nuevo(orgId, FinanzaNaturaleza.EGRESO),
      icon: '📤',
      label: 'Registrar gasto',
      variant: 'gasto',
    },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>FINANZAS RÁPIDAS</Text>
      <View style={styles.row}>
        {actions.map((action) => (
          <Pressable
            key={action.label}
            onPress={() => router.push(action.href)}
            style={({ pressed }) => [
              action.variant === 'gasto' ? styles.actionCardGasto : styles.actionCard,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.actionIcon}>{action.icon}</Text>
            <Text
              style={action.variant === 'gasto' ? styles.actionLabelGasto : styles.actionLabel}
            >
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 8,
    gap: 8,
  },
  sectionLabel: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  actionCard: {
    flex: 1,
    backgroundColor: PremiumPalette.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: PremiumPalette.surfaceMuted,
    ...PremiumShadow.card,
  },
  actionCardGasto: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: PremiumPalette.danger,
    ...PremiumShadow.card,
  },
  actionIcon: {
    fontSize: 26,
  },
  actionLabel: {
    color: PremiumPalette.textOnDark,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  actionLabelGasto: {
    color: PremiumPalette.danger,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.88,
  },
});
