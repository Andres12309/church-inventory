import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAuthStore } from '@/features/auth/presentation/store/authStore';
import type { ResumenSistema } from '@/features/configuracion/domain/entities/ResumenSistema';
import { ModuloCodigo } from '@/shared/infrastructure/database/schema';
import { PremiumPalette } from '@/shared/presentation/ui/premiumPalette';
import {
  SocialCard,
  SocialEmpty,
  SocialHeader,
  SocialScreen,
  SocialStatCard,
} from '@/shared/presentation/ui/socialUi';

import { useConfiguracionUseCases } from '../hooks/useConfiguracionUseCases';

export function ConfiguracionResumenScreen() {
  const permissionService = useAuthStore((s) => s.permissionService);
  const tieneAcceso = useAuthStore((s) => s.tieneAcceso(ModuloCodigo.CONFIGURACION));

  const { obtenerResumenSistema } = useConfiguracionUseCases();

  const [resumen, setResumen] = useState<ResumenSistema | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!permissionService || !tieneAcceso) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await obtenerResumenSistema.execute(permissionService);
      setResumen(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudo cargar la configuración',
      );
    } finally {
      setIsLoading(false);
    }
  }, [obtenerResumenSistema, permissionService, tieneAcceso]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (!tieneAcceso) {
    return (
      <SocialScreen scroll={false}>
        <SocialEmpty
          icon="🔒"
          title="Sin acceso"
          message="Solo el administrador del sistema puede ver esta sección."
        />
      </SocialScreen>
    );
  }

  if (isLoading) {
    return (
      <ActivityIndicator
        size="large"
        color={PremiumPalette.primary}
        style={styles.loader}
      />
    );
  }

  return (
    <SocialScreen>
      <SocialHeader
        title="Configuración"
        subtitle="Resumen del sistema local y módulos activos"
      />

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      {resumen ? (
        <>
          <SocialCard>
            <Text style={styles.cardTitle}>Datos locales</Text>
            <View style={styles.statsRow}>
              <SocialStatCard label="Usuarios" value={String(resumen.totalUsuariosActivos)} />
              <SocialStatCard label="Organizaciones" value={String(resumen.totalOrganizacionesActivas)} />
            </View>
            <View style={styles.statsRow}>
              <SocialStatCard label="Bienes" value={String(resumen.totalBienes)} />
              <SocialStatCard label="Ofrendas" value={String(resumen.totalOfrendas)} />
            </View>
          </SocialCard>

          <SocialCard>
            <Text style={styles.cardTitle}>Módulos activos ({resumen.modulosActivos.length})</Text>
            {resumen.modulosActivos.map((modulo) => (
              <View key={modulo.id} style={styles.moduloRow}>
                <Text style={styles.moduloNombre}>{modulo.nombre}</Text>
                <Text style={styles.moduloCodigo}>{modulo.codigo}</Text>
              </View>
            ))}
          </SocialCard>
        </>
      ) : null}
    </SocialScreen>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, marginTop: 48 },
  error: { color: PremiumPalette.danger, fontSize: 13 },
  cardTitle: { color: PremiumPalette.textOnDark, fontSize: 15, fontWeight: '800', marginBottom: 10 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  moduloRow: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: PremiumPalette.surfaceMuted,
    gap: 2,
  },
  moduloNombre: { color: PremiumPalette.textOnDark, fontSize: 14, fontWeight: '600' },
  moduloCodigo: { color: PremiumPalette.textMutedOnDark, fontSize: 12 },
});
