import { Link, type Href } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAuthStore } from '@/features/auth/presentation/store/authStore';
import { CONFIGURACION_ROUTES } from '@/features/configuracion/presentation/routes';
import { ORGANIZACIONES_ROUTES } from '@/features/organizaciones/presentation/routes';
import { REPORTES_ROUTES } from '@/features/reportes/presentation/routes';
import { SYNC_ROUTES } from '@/features/sync/presentation/routes';
import { USUARIOS_ROUTES } from '@/features/usuarios/presentation/routes';
import { ModuloCodigo } from '@/shared/infrastructure/database/schema';
import { PremiumPalette } from '@/shared/presentation/ui/premiumPalette';

type AdminLink = {
  codigo: (typeof ModuloCodigo)[keyof typeof ModuloCodigo];
  href: Href;
  title: string;
  glyph: string;
};

const ADMIN_LINKS: AdminLink[] = [
  {
    codigo: ModuloCodigo.ORGANIZACIONES,
    href: ORGANIZACIONES_ROUTES.dashboard,
    title: 'Organizaciones',
    glyph: '🏛️',
  },
  {
    codigo: ModuloCodigo.USUARIOS,
    href: USUARIOS_ROUTES.listado,
    title: 'Usuarios',
    glyph: '👥',
  },
  {
    codigo: ModuloCodigo.REPORTES,
    href: REPORTES_ROUTES.listado,
    title: 'Reportes',
    glyph: '📊',
  },
  {
    codigo: ModuloCodigo.SYNC,
    href: SYNC_ROUTES.dashboard,
    title: 'Sincronización P2P',
    glyph: '↻',
  },
  {
    codigo: ModuloCodigo.CONFIGURACION,
    href: CONFIGURACION_ROUTES.resumen,
    title: 'Configuración',
    glyph: '⚙️',
  },
];

export function DashboardAdminLinks() {
  const tieneAcceso = useAuthStore((state) => state.tieneAcceso);
  const visibleLinks = ADMIN_LINKS.filter((link) => tieneAcceso(link.codigo));

  if (visibleLinks.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>GESTIÓN Y HERRAMIENTAS</Text>
      <View style={styles.grid}>
        {visibleLinks.map((link) => (
          <Link key={link.title} href={link.href} asChild>
            <TouchableOpacity activeOpacity={0.88} style={styles.linkCard}>
              <Text style={styles.glyph}>{link.glyph}</Text>
              <Text style={styles.title}>{link.title}</Text>
            </TouchableOpacity>
          </Link>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
    marginTop: 8,
  },
  sectionLabel: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  linkCard: {
    width: '47%',
    backgroundColor: PremiumPalette.surface,
    borderRadius: 14,
    padding: 14,
    gap: 6,
    minHeight: 88,
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 22,
  },
  title: {
    color: PremiumPalette.textOnDark,
    fontSize: 14,
    fontWeight: '700',
  },
});
