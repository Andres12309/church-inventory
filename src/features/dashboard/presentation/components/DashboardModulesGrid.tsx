import { Link, type Href } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAuthStore } from '@/features/auth/presentation/store/authStore';
import { BIENES_ROUTES } from '@/features/bienes/presentation/routes';
import { formatearMonto } from '@/features/ofrendas/presentation/store/ofrendasStore';
import { OFRENDAS_ROUTES } from '@/features/ofrendas/presentation/routes';
import { ORGANIZACIONES_ROUTES } from '@/features/organizaciones/presentation/routes';
import { SYNC_ROUTES } from '@/features/sync/presentation/routes';
import { ModuloCodigo } from '@/shared/infrastructure/database/schema';
import { PremiumPalette } from '@/shared/presentation/ui/premiumPalette';

type DashboardModulesGridProps = {
  totalBienes: number;
  totalOfrendas: number;
};

type ModuleConfig = {
  codigo: (typeof ModuloCodigo)[keyof typeof ModuloCodigo];
  href: Href;
  title: string;
  description: string;
  glyph: string;
  stat?: string;
};

export function DashboardModulesGrid({ totalBienes, totalOfrendas }: DashboardModulesGridProps) {
  const tieneAcceso = useAuthStore((state) => state.tieneAcceso);

  const bienesStat = totalBienes > 0 ? `${totalBienes} registrados` : undefined;
  const ofrendasStat = totalOfrendas > 0 ? formatearMonto(totalOfrendas) : undefined;

  const modules: ModuleConfig[] = [
    {
      codigo: ModuloCodigo.ORGANIZACIONES,
      href: ORGANIZACIONES_ROUTES.dashboard,
      title: 'Organizaciones y Capillas',
      description: 'Administra el árbol jerárquico y geolocalización de tus templos.',
      glyph: '🏛️',
    },
    {
      codigo: ModuloCodigo.INVENTARIO_BIENES,
      href: BIENES_ROUTES.listado(),
      title: 'Inventario de Bienes',
      description: 'Controla el patrimonio físico, estados y fotografías locales.',
      glyph: '📦',
      stat: bienesStat,
    },
    {
      codigo: ModuloCodigo.OFRENDAS,
      href: OFRENDAS_ROUTES.dashboard(),
      title: 'Ofrendas y Finanzas',
      description: 'Registra colectas, misas y genera balances al vuelo.',
      glyph: '💰',
      stat: ofrendasStat,
    },
    {
      codigo: ModuloCodigo.SYNC,
      href: SYNC_ROUTES.dashboard,
      title: 'Sincronización P2P',
      description: 'Comparte datos entre dispositivos en la red local de la comunidad.',
      glyph: '↻',
    },
  ];

  const visibleModules = modules.filter((module) => tieneAcceso(module.codigo));

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>MÓDULOS DEL SISTEMA</Text>

      {visibleModules.map((module) => (
        <Link key={module.title} href={module.href} asChild>
          <TouchableOpacity activeOpacity={0.88} style={styles.moduleCard}>
            <View style={styles.iconWrap}>
              <Text style={styles.glyph}>{module.glyph}</Text>
            </View>

            <View style={styles.copy}>
              <Text style={styles.title}>{module.title}</Text>
              <Text style={styles.description}>{module.description}</Text>
              {module.stat ? <Text style={styles.stat}>{module.stat}</Text> : null}
            </View>

            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </Link>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 4,
  },
  sectionLabel: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PremiumPalette.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: PremiumPalette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 24,
  },
  copy: {
    flex: 1,
    marginLeft: 12,
    gap: 4,
  },
  title: {
    color: PremiumPalette.textOnDark,
    fontSize: 16,
    fontWeight: 'bold',
  },
  description: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 13,
    lineHeight: 18,
  },
  stat: {
    color: PremiumPalette.accent,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  chevron: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 24,
    fontWeight: '300',
    marginLeft: 8,
  },
});
