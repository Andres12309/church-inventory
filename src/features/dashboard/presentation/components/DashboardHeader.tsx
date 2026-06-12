import { StyleSheet, Text, View } from 'react-native';

import { PremiumPalette } from '@/shared/presentation/ui/premiumPalette';

import type { Rol } from '@/features/auth/domain/entities/Rol';
import type { Usuario } from '@/features/auth/domain/entities/Usuario';

type DashboardHeaderProps = {
  usuario: Usuario;
  rol: Rol;
  scopeLabel: string;
};

export function DashboardHeader({ usuario, rol, scopeLabel }: DashboardHeaderProps) {
  const primerNombre = usuario.nombre.split(' ')[0] ?? usuario.nombre;

  return (
    <View style={styles.header}>
      <Text style={styles.greeting}>¡Bienvenido, {primerNombre}!</Text>

      <View style={styles.badges}>
        <View style={[styles.badge, { backgroundColor: PremiumPalette.primary }]}>
          <Text style={styles.badgeText}>{rol.nombre}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: PremiumPalette.accent }]}>
          <Text style={styles.badgeText}>{scopeLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 8,
    gap: 16,
  },
  greeting: {
    color: PremiumPalette.textOnDark,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
