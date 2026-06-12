import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabInset, MaxContentWidth } from '@/constants/theme';
import { ASISTENTE_ROUTES } from '@/features/asistente/presentation/routes';
import { AUTH_ROUTES } from '@/features/auth/presentation/routes';
import { useAuthStore } from '@/features/auth/presentation/store/authStore';
import { useDashboardStore } from '@/features/dashboard/presentation/store/dashboardStore';
import { SYNC_ROUTES } from '@/features/sync/presentation/routes';
import { createConsolidationService } from '@/shared/infrastructure/background/createConsolidationTrigger';
import { ModuloCodigo } from '@/shared/infrastructure/database/schema';
import {
  buscarActualizacionOta,
  descargarYRecargarOta,
  formatearEtiquetaOta,
} from '@/shared/infrastructure/updates/otaUpdateService';
import { AppActivityIndicator } from '@/shared/presentation/ui/AppActivityIndicator';
import { PremiumPalette } from '@/shared/presentation/ui/premiumPalette';
import { SocialHeader } from '@/shared/presentation/ui/socialUi';

import { SettingsRow } from '../components/SettingsRow';
import { usePerfilAjustesData } from '../hooks/usePerfilAjustesData';

function obtenerIniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length >= 2) {
    return `${partes[0]?.[0] ?? ''}${partes[1]?.[0] ?? ''}`.toUpperCase();
  }
  return (partes[0]?.slice(0, 2) ?? 'FB').toUpperCase();
}

export function PerfilAjustesScreen() {
  const router = useRouter();
  const db = useSQLiteContext();

  const usuario = useAuthStore((s) => s.usuarioActual);
  const rol = useAuthStore((s) => s.rolActual);
  const logout = useAuthStore((s) => s.logout);
  const tieneAcceso = useAuthStore((s) => s.tieneAcceso);

  const { snapshot, isLoading, errorMessage, recargar } = usePerfilAjustesData(
    usuario?.organizacionId,
  );

  const consolidationService = useMemo(() => createConsolidationService(db), [db]);

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);

  const appVersion =
    snapshot?.appVersion ??
    Constants.expoConfig?.version ??
    '1.0.0';

  const handleLogout = useCallback(async () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Deseas salir de este dispositivo? Deberás ingresar tu PIN nuevamente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setIsLoggingOut(true);
              try {
                await logout();
                router.replace(AUTH_ROUTES.login);
              } finally {
                setIsLoggingOut(false);
              }
            })();
          },
        },
      ],
    );
  }, [logout, router]);

  const handleConsolidar = useCallback(async () => {
    setIsConsolidating(true);
    try {
      await consolidationService.consolidarTodoElArbol();
      useDashboardStore.getState().bumpRefresh();
      await recargar();
      Alert.alert(
        'Mantenimiento completado',
        'Los agregados de inventario y finanzas se recalcularon correctamente.',
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo ejecutar la recaudación de agregados';
      Alert.alert('Error de mantenimiento', message);
    } finally {
      setIsConsolidating(false);
    }
  }, [consolidationService, recargar]);

  const handleBuscarActualizaciones = useCallback(async () => {
    setIsCheckingUpdates(true);
    try {
      const result = await buscarActualizacionOta();

      switch (result.status) {
        case 'unavailable':
          Alert.alert('Actualizaciones OTA', result.reason);
          break;
        case 'error':
          Alert.alert(
            'No se pudo verificar',
            `${result.message}\n\nComprueba tu conexión a internet e inténtalo de nuevo.`,
          );
          break;
        case 'upToDate':
          Alert.alert(
            'Sin actualizaciones',
            `Ya tienes la última versión OTA publicada para este runtime.\n\n${formatearEtiquetaOta(result.runtime)}`,
          );
          break;
        case 'available':
          Alert.alert(
            'Actualización disponible',
            'Hay una nueva versión en EAS Update. Se descargará el bundle JS y la app se reiniciará. Requiere internet.',
            [
              { text: 'Más tarde', style: 'cancel' },
              {
                text: 'Descargar e instalar',
                onPress: () => {
                  void (async () => {
                    setIsCheckingUpdates(true);
                    try {
                      await descargarYRecargarOta();
                    } catch (error) {
                      const message =
                        error instanceof Error
                          ? error.message
                          : 'No se pudo descargar la actualización';
                      Alert.alert('Error al actualizar', message);
                      setIsCheckingUpdates(false);
                    }
                  })();
                },
              },
            ],
          );
          break;
      }
    } finally {
      setIsCheckingUpdates(false);
    }
  }, []);

  const handleSync = useCallback(() => {
    if (!tieneAcceso(ModuloCodigo.SYNC)) {
      Alert.alert('Sin acceso', 'Tu rol no tiene permiso para abrir la sincronización P2P.');
      return;
    }
    router.push(SYNC_ROUTES.dashboard);
  }, [router, tieneAcceso]);

  if (!usuario || !rol) {
    return (
      <View style={[styles.container, styles.centered]}>
        <AppActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <SocialHeader
            title="Ajustes"
            subtitle="Perfil local, almacenamiento y mantenimiento"
            showBack={false}
          />

          <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{obtenerIniciales(usuario.nombre)}</Text>
              </View>

              <View style={styles.profileCopy}>
                <Text style={styles.profileName}>{usuario.nombre}</Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{rol.nombre}</Text>
                </View>
                <Text style={styles.orgName}>
                  {snapshot?.organizacionNombre ?? 'Cargando organización…'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.logoutButton}
              activeOpacity={0.85}
              disabled={isLoggingOut}
              onPress={() => void handleLogout()}
            >
              <Text style={styles.logoutText}>
                {isLoggingOut ? 'Cerrando sesión…' : 'Cerrar sesión local'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionLabel}>ASISTENTE</Text>
          <View style={styles.settingsCard}>
            <SettingsRow
              icon="🤖"
              title="Asistente Fieles"
              subtitle="Pregunta por voz o texto dónde está cada módulo"
              onPress={() => router.push(ASISTENTE_ROUTES.pantalla)}
            />
          </View>

          <Text style={styles.sectionLabel}>SISTEMA Y DATOS</Text>
          <View style={styles.settingsCard}>
            <SettingsRow
              icon="🔄"
              title="Sincronización P2P"
              subtitle="Configurar enlace inalámbrico con otros teléfonos"
              onPress={handleSync}
            />
            <View style={styles.divider} />
            <SettingsRow
              icon="📂"
              title="Almacenamiento Local"
              subtitle={
                snapshot
                  ? `Fotos guardadas: ${snapshot.almacenamiento.fotosGuardadas} | Base de datos: ${snapshot.almacenamiento.baseDatosMb}`
                  : 'Calculando uso local…'
              }
              showChevron={false}
            />
            <View style={styles.divider} />
            <SettingsRow
              icon="🧮"
              title="Mantenimiento"
              subtitle="Forzar recaudación de agregados"
              onPress={() => void handleConsolidar()}
              loading={isConsolidating}
            />
          </View>

          <Text style={styles.sectionLabel}>INFORMACIÓN Y ACTUALIZACIONES</Text>
          <View style={styles.settingsCard}>
            <SettingsRow
              icon="🚀"
              title="Buscar actualizaciones OTA"
              subtitle={
                snapshot
                  ? snapshot.otaEtiqueta
                  : `Versión instalada: v${appVersion}`
              }
              onPress={() => void handleBuscarActualizaciones()}
              loading={isCheckingUpdates}
            />
            <View style={styles.divider} />
            <SettingsRow
              icon="📱"
              title="Información del Dispositivo"
              subtitle={
                snapshot
                  ? `ID: ${snapshot.deviceId.slice(0, 8)}…${snapshot.deviceId.slice(-4)} | SQLite v${snapshot.dbVersion}`
                  : 'Obteniendo identificadores…'
              }
              showChevron={false}
            />
            {snapshot ? (
              <View style={styles.deviceMeta}>
                <Text style={styles.deviceMetaText}>Device ID completo</Text>
                <Text style={styles.deviceMetaValue} selectable>
                  {snapshot.deviceId}
                </Text>
                <Text style={styles.deviceMetaText}>Base de datos: fieles_bienes.db</Text>
              </View>
            ) : null}
          </View>

          {isLoading ? (
            <View style={styles.loadingRow}>
              <AppActivityIndicator size="small" />
              <Text style={styles.loadingText}>Sincronizando datos del sistema…</Text>
            </View>
          ) : null}

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
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
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: BottomTabInset + 24,
    gap: 12,
  },
  profileCard: {
    backgroundColor: PremiumPalette.surface,
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: PremiumPalette.primarySoft,
    borderWidth: 2,
    borderColor: PremiumPalette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: PremiumPalette.accent,
    fontSize: 22,
    fontWeight: '800',
  },
  profileCopy: {
    flex: 1,
    gap: 6,
  },
  profileName: {
    color: PremiumPalette.textOnDark,
    fontSize: 18,
    fontWeight: '800',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: PremiumPalette.primary,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  orgName: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 14,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: PremiumPalette.danger,
    backgroundColor: PremiumPalette.dangerSoft,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: '#FCA5A5',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionLabel: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 8,
  },
  settingsCard: {
    backgroundColor: PremiumPalette.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: PremiumPalette.surfaceMuted,
    marginHorizontal: 16,
  },
  deviceMeta: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 4,
  },
  deviceMetaText: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 12,
  },
  deviceMetaValue: {
    color: PremiumPalette.textSoftOnDark,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 6,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  loadingText: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 13,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
    textAlign: 'center',
  },
});
