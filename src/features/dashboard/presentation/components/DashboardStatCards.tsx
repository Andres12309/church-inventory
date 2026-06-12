import { StyleSheet, Text, View } from 'react-native';

import { formatearMonto } from '@/features/ofrendas/presentation/store/ofrendasStore';
import { AppActivityIndicator } from '@/shared/presentation/ui/AppActivityIndicator';
import { PremiumPalette, PremiumShadow } from '@/shared/presentation/ui/premiumPalette';
import { PrimaryButton } from '@/shared/presentation/ui/PrimaryButton';

type DashboardStatCardsProps = {
  totalOfrendas: number;
  totalBienes: number;
  bienesMalEstado: number;
  cacheEmpty: boolean;
  isLoading: boolean;
  isRecalculating: boolean;
  onForzarRecalculo: () => void;
};

export function DashboardStatCards({
  totalOfrendas,
  totalBienes,
  bienesMalEstado,
  cacheEmpty,
  isLoading,
  isRecalculating,
  onForzarRecalculo,
}: DashboardStatCardsProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <StatCard
          title="Total Recaudado"
          value={formatearMonto(totalOfrendas)}
          subtitle="Consolidado en caché"
        />
        <StatCard
          title="Bienes Registrados"
          value={String(totalBienes)}
          subtitle="Patrimonio bajo tu alcance"
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingRow}>
          <AppActivityIndicator size="small" />
          <Text style={styles.loadingText}>Actualizando totales…</Text>
        </View>
      ) : null}

      <View
        style={[
          styles.alertRow,
          bienesMalEstado > 0 ? styles.alertDanger : styles.alertOk,
        ]}
      >
        <Text style={[styles.alertText, bienesMalEstado > 0 && styles.alertTextDanger]}>
          {bienesMalEstado > 0
            ? `⚠ ${bienesMalEstado} bien(es) en mal estado requieren atención`
            : '✓ Sin bienes en mal estado bajo tu alcance'}
        </Text>
      </View>

      {cacheEmpty ? (
        <View style={styles.emptyCache}>
          <Text style={styles.emptyCacheText}>
            La caché de totales aún no está materializada. Mostrando valores iniciales en $0.00.
          </Text>
          <PrimaryButton
            label="Forzar Recálculo"
            variant="accent"
            loading={isRecalculating}
            onPress={onForzarRecalculo}
            style={{ alignSelf: 'stretch' }}
          />
        </View>
      ) : null}
    </View>
  );
}

type StatCardProps = {
  title: string;
  value: string;
  subtitle: string;
};

function StatCard({ title, value, subtitle }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: PremiumPalette.accent,
    borderRadius: 12,
    padding: 16,
    minHeight: 108,
    justifyContent: 'center',
    gap: 4,
    ...PremiumShadow.card,
  },
  statTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  statSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  loadingText: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 13,
  },
  alertRow: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  alertOk: {
    backgroundColor: PremiumPalette.surface,
    borderColor: PremiumPalette.surfaceMuted,
  },
  alertDanger: {
    backgroundColor: PremiumPalette.dangerSoft,
    borderColor: PremiumPalette.danger,
  },
  alertText: {
    color: PremiumPalette.textSoftOnDark,
    fontSize: 13,
    lineHeight: 20,
  },
  alertTextDanger: {
    color: '#FCA5A5',
  },
  emptyCache: {
    gap: 10,
    alignItems: 'center',
  },
  emptyCacheText: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
