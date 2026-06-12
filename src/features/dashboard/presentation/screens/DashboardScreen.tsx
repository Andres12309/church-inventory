import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabInset, MaxContentWidth } from '@/constants/theme';
import { PremiumPalette } from '@/shared/presentation/ui/premiumPalette';

import { DashboardAdminLinks } from '../components/DashboardAdminLinks';
import { DashboardStatCards } from '../components/DashboardStatCards';
import { useDashboardData } from '../hooks/useDashboardData';
import { SocialHeader } from '@/shared/presentation/ui/socialUi';

export function DashboardScreen() {
  const {
    usuarioActual,
    rolActual,
    isLoading,
    isRecalculating,
    errorMessage,
    scopeLabel,
    totalBienes,
    totalOfrendas,
    bienesMalEstado,
    cacheEmpty,
    forzarRecalculo,
  } = useDashboardData();

  if (!usuarioActual || !rolActual) {
    return null;
  }

  const primerNombre = usuarioActual.nombre.split(' ')[0] ?? usuarioActual.nombre;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <SocialHeader
            title={`Hola, ${primerNombre}`}
            subtitle={scopeLabel}
            badge={rolActual.nombre}
            showBack={false}
          />

          <DashboardStatCards
            totalOfrendas={totalOfrendas}
            totalBienes={totalBienes}
            bienesMalEstado={bienesMalEstado}
            cacheEmpty={cacheEmpty}
            isLoading={isLoading}
            isRecalculating={isRecalculating}
            onForzarRecalculo={() => void forzarRecalculo()}
          />

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          <DashboardAdminLinks />

          <Text style={styles.footerNote}>
            Toca el botón ⚡ flotante para abrir el asistente o acciones rápidas. Arrástralo para moverlo.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PremiumPalette.canvas,
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: BottomTabInset + 96,
    gap: 8,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
    lineHeight: 20,
  },
  footerNote: {
    color: PremiumPalette.textMutedOnDark,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 12,
    paddingHorizontal: 8,
    marginTop: 8,
  },
});
