import { Link, type Href } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ORGANIZACIONES_ROUTES } from '@/features/organizaciones/presentation/routes';
import { USUARIOS_ROUTES } from '@/features/usuarios/presentation/routes';
import { PremiumPalette, PremiumShadow } from '@/shared/presentation/ui/premiumPalette';

type DashboardQuickActionsProps = {
  parroquiaId: string | null;
};

type QuickActionConfig = {
  href: Href;
  icon: string;
  label: string;
};

export function DashboardQuickActions({ parroquiaId }: DashboardQuickActionsProps) {
  if (!parroquiaId) {
    return null;
  }

  const actions: QuickActionConfig[] = [
    {
      href: ORGANIZACIONES_ROUTES.nuevaCapilla(parroquiaId),
      icon: '⛪',
      label: 'Nueva Capilla',
    },
    {
      href: USUARIOS_ROUTES.nuevo,
      icon: '👤',
      label: 'Registrar Usuario',
    },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>ACCIONES RÁPIDAS DE GESTIÓN</Text>

      <View style={styles.row}>
        {actions.map((action) => (
          <Link key={action.label} href={action.href} asChild>
            <TouchableOpacity activeOpacity={0.85} style={styles.actionCard}>
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          </Link>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginVertical: 16,
  },
  sectionLabel: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: PremiumPalette.surfaceLight,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    ...PremiumShadow.card,
  },
  actionIcon: {
    fontSize: 28,
    color: PremiumPalette.primary,
    marginBottom: 8,
  },
  actionLabel: {
    color: PremiumPalette.textOnLight,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
